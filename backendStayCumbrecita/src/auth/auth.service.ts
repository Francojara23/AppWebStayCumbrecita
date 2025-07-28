import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RegisterAuthDTO, TipoRolRegistro } from "./dto/register-auth.dto";
import { Usuario } from "src/users/users.entity";
import { Repository, ILike, MoreThan } from "typeorm";
import { compare, hash } from "bcryptjs";
import { LoginAuthDTO } from "./dto/login-auth.dto";
import { JwtService } from "@nestjs/jwt";
import { Rol } from "../roles/roles.entity";
import { UsuarioRol } from "../users/usersRoles.entity";
import { Owner } from "../owners/owners.entity";
import { Hospedaje } from "../hospedajes/entidades/hospedaje.entity";
import { Empleado } from "../empleados/entidades/empleado.entity";
import { ChangePasswordDTO } from "./dto/change-password.dto";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { MailService } from "src/mail/mail.service";
import { ImagesService } from "src/uploads/images/images.service";
import { v4 as uuidv4 } from "uuid";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateSuperAdminDTO } from "./dto/create-superadmin.dto";

/**
 * Servicio que maneja la lógica de autenticación y autorización del sistema.
 * Incluye registro, login, gestión de tokens JWT, verificación de email y recuperación de contraseña.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol) private rolesRepository: Repository<Rol>,
    @InjectRepository(UsuarioRol)
    private usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(Owner) private ownersRepository: Repository<Owner>,
    @InjectRepository(Hospedaje)
    private hospedajesRepository: Repository<Hospedaje>,
    @InjectRepository(Empleado)
    private empleadosRepository: Repository<Empleado>,
    private jwtService: JwtService,
    private mailService: MailService,
    private imagesService: ImagesService,
  ) {}

  /**
   * Registra un nuevo usuario en el sistema.
   * Verifica duplicados de email y DNI.
   * Asigna roles según el tipo de registro.
   * @param dto - Datos del usuario a registrar
   * @returns Usuario creado con su token JWT
   * @throws HttpException si el email o DNI ya están registrados
   */
  async register(dto: RegisterAuthDTO) {
    const { email, dni, tipoRegistro } = dto;

    /* ------------------------------------------------------------------ */
    /* 1) Duplicados                                                      */
    /* ------------------------------------------------------------------ */
    if (await this.usuariosRepository.findOneBy({ email }))
      throw new HttpException("El email ya está registrado", 409);

    if (
      tipoRegistro === TipoRolRegistro.ADMIN &&
      (await this.usuariosRepository.findOneBy({ dni }))
    )
      throw new HttpException("El DNI ya está registrado", 409);

    /* ------------------------------------------------------------------ */
    /* 2) Crear usuario (password se hashea por hook en entidad)          */
    /* ------------------------------------------------------------------ */
    const verificationToken = uuidv4();
    const usuario = this.usuariosRepository.create({
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      password: dto.password,
      telefono: dto.telefono,
      dni: dto.dni,
      direccion: dto.direccion,
      emailVerificationToken: verificationToken,
      estadoConfirmacion: false, // Por defecto false hasta que verifique
    });
    await this.usuariosRepository.save(usuario);

    /* ------------------------------------------------------------------ */
    /* 3) Decidir rol final                                               */
    /* ------------------------------------------------------------------ */
    let rolFinal: "TURISTA" | "EMPLEADO" | "PROPIETARIO";

    if (dto.tipoRegistro === TipoRolRegistro.TURISTA) {
      rolFinal = "TURISTA";
    } else {
      // tipoRegistro === ADMIN
      const owner = await this.ownersRepository.findOne({
        where: { dni: dni.toString() },
      });

      if (owner) {
        rolFinal = "PROPIETARIO";
      } else {
        rolFinal = "EMPLEADO";
      }
    }

    /* ------------------------------------------------------------------ */
    /* 4) Pivot global usuarios_roles                                     */
    /* ------------------------------------------------------------------ */
    const rolEntidad = await this.rolesRepository.findOneByOrFail({
      nombre: rolFinal,
    });
    await this.usuarioRolRepository.save({ usuario, rol: rolEntidad });

    /* ------------------------------------------------------------------ */
    /* 5) Enviar email de verificación                                    */
    /* ------------------------------------------------------------------ */
    // Enviar email de verificación usando MailService con el token UUID
    await this.mailService.sendVerificationEmail(dto.email, verificationToken, dto.nombre);

    return {
      message: "Usuario registrado exitosamente. Por favor verifica tu email.",
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      },
    };
  }

  /**
   * Autentica un usuario y genera su token JWT.
   * @param loginDTO - Credenciales de acceso
   * @returns Datos del usuario y token JWT
   * @throws HttpException si las credenciales son inválidas
   */
  async login(loginDTO: LoginAuthDTO) {
    const { email, password } = loginDTO;

    // Busca el usuario por email de manera case-insensitive
    const userFound = await this.usuariosRepository.findOne({
      where: { email: ILike(email) },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!userFound) {
      throw new HttpException(
        "El email no está registrado",
        HttpStatus.NOT_FOUND,
      );
    }

    // Verifica si la contraseña es correcta
    const isPasswordValid = userFound.password
      ? await compare(password, userFound.password)
      : false;
    if (!isPasswordValid) {
      throw new HttpException(
        "La contraseña es incorrecta",
        HttpStatus.FORBIDDEN,
      );
    }

    // Verifica si el email ha sido confirmado
    if (!userFound.estadoConfirmacion) {
      throw new HttpException(
        "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
        HttpStatus.FORBIDDEN,
      );
    }

    // Obtiene los roles del usuario
    const roles = userFound.rolesGlobales.map((ur) => ur.rol);

    // Genera el token JWT
    const payload = {
      id: userFound.id,
      nombre: userFound.nombre,
      apellido: userFound.apellido,
      roles: roles.map((rol) => rol.nombre),
    };
    const token = this.jwtService.sign(payload);

    // Retorna los datos del usuario y el token
    const data = {
      user: {
        id: userFound.id,
        nombre: userFound.nombre,
        apellido: userFound.apellido,
        email: userFound.email,
        telefono: userFound.telefono,
        dni: userFound.dni,
        direccion: userFound.direccion,
        fotoUrl: userFound.fotoUrl,
        roles: roles.map((rol) => ({
          id: rol.id,
          nombre: rol.nombre,
          descripcion: rol.descripcion,
        })),
      },
      token: token,
    };
    return data;
  }

  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await this.usuariosRepository.findOneBy({ id: userId });
    if (!user) {
      throw new HttpException("Usuario no encontrado", HttpStatus.NOT_FOUND);
    }

    const isPasswordValid = await compare(dto.passwordActual, user.password);
    if (!isPasswordValid) {
      throw new HttpException(
        "Contraseña actual incorrecta",
        HttpStatus.BAD_REQUEST,
      );
    }

    user.password = await hash(dto.passwordNueva, 10);
    await this.usuariosRepository.save(user);

    return { message: "Contraseña actualizada exitosamente" };
  }

  async forgotPassword(dto: ForgotPasswordDTO) {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: dto.email },
    });

    if (!usuario) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const token = this.jwtService.sign(
      { id: usuario.id, email: usuario.email },
      { expiresIn: "1h" },
    );

    // Enviar email de restablecimiento usando MailService
    await this.mailService.sendPasswordResetEmail(dto.email, token, usuario.nombre);

    return {
      message:
        "Se ha enviado un email con instrucciones para restablecer tu contraseña.",
    };
  }

  async resetPassword(dto: ResetPasswordDTO) {
    const user = await this.usuariosRepository.findOne({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new HttpException(
        "Token inválido o expirado",
        HttpStatus.BAD_REQUEST,
      );
    }

    user.password = await hash(dto.passwordNueva, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await this.usuariosRepository.save(user);

    return { message: "Contraseña actualizada exitosamente" };
  }

  /**
   * Verifica el email de un usuario usando el token de verificación.
   * @param token - Token de verificación de email
   * @returns Mensaje de confirmación
   * @throws HttpException si el token es inválido
   */
  async verifyEmail(token: string) {
    if (!token) {
      throw new HttpException(
        "Token de verificación es requerido",
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.usuariosRepository.findOne({
      where: { emailVerificationToken: token },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!user) {
      throw new HttpException(
        "Token de verificación inválido o expirado",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user.estadoConfirmacion) {
      throw new HttpException(
        "El email ya ha sido verificado",
        HttpStatus.BAD_REQUEST,
      );
    }

    user.estadoConfirmacion = true;
    user.emailVerificationToken = undefined; // Limpiar el token después de usar
    await this.usuariosRepository.save(user);

    // Obtener el rol principal del usuario para determinar la redirección
    const roles = user.rolesGlobales.map((ur) => ur.rol);
    const userType = roles.some(rol => rol.nombre === "TURISTA") ? "tourist" : "admin";

    return { 
      message: "Email verificado exitosamente",
      userType: userType
    };
  }

  /**
   * Envía un email de verificación al usuario
   * @param userId ID del usuario
   * @throws HttpException si el usuario no existe o ya está verificado
   */
  async resendVerificationEmail(userId: string) {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: userId },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!usuario) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (usuario.estadoConfirmacion) {
      throw new BadRequestException("El email ya está verificado");
    }

    const verificationToken = uuidv4();
    usuario.emailVerificationToken = verificationToken;
    await this.usuariosRepository.save(usuario);

    await this.mailService.sendVerificationEmail(
      usuario.email,
      verificationToken,
      usuario.nombre,
    );

    return {
      message: "Email de verificación enviado exitosamente",
    };
  }

  /**
   * Renueva el token JWT del usuario
   * @param userId ID del usuario
   * @returns Nuevo token JWT
   * @throws HttpException si el usuario no existe
   */
  async refreshToken(userId: string) {
    const user = await this.usuariosRepository.findOne({
      where: { id: userId },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const roles = user.rolesGlobales.map((ur) => ur.rol);
    const payload = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      roles: roles.map((rol) => rol.nombre),
    };

    return {
      token: this.jwtService.sign(payload),
    };
  }

  /**
   * Obtiene el perfil del usuario
   * @param userId ID del usuario
   * @returns Datos del perfil del usuario
   * @throws HttpException si el usuario no existe
   */
  async getProfile(userId: string) {
    const user = await this.usuariosRepository.findOne({
      where: { id: userId },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const roles = user.rolesGlobales.map((ur) => ur.rol);
    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      dni: user.dni,
      direccion: user.direccion,
      fotoUrl: user.fotoUrl,
      estadoConfirmacion: user.estadoConfirmacion,
      roles: roles.map((rol) => ({
        id: rol.id,
        nombre: rol.nombre,
      })),
    };
  }

  /**
   * Actualiza el perfil del usuario
   * @param userId ID del usuario
   * @param dto Datos a actualizar
   * @returns Perfil actualizado
   * @throws HttpException si el usuario no existe o el email ya está registrado
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usuariosRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Si se intenta cambiar el email, verificar que no exista
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.usuariosRepository.findOneBy({
        email: dto.email,
      });
      if (existingUser) {
        throw new BadRequestException("El email ya está registrado");
      }
    }

    // Actualizar solo los campos proporcionados
    Object.assign(user, dto);
    await this.usuariosRepository.save(user);

    return {
      message: "Perfil actualizado exitosamente",
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        direccion: user.direccion,
      },
    };
  }

  /**
   * Actualiza únicamente la foto de perfil del usuario
   * @param userId ID del usuario
   * @param file Archivo de imagen a subir
   * @returns Confirmación y nueva URL de la foto
   * @throws HttpException si el usuario no existe o hay error en la subida
   */
  async updateProfileImage(userId: string, file: Express.Multer.File) {
    const user = await this.usuariosRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    try {
      // Validar que sea una imagen
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Solo se permiten archivos de imagen (jpg, jpeg, png, gif)');
      }

      // Validar tamaño del archivo (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('El archivo es demasiado grande. Máximo 5MB permitido');
      }

      // Si el usuario ya tiene una foto, eliminar la anterior de Cloudinary
      if (user.fotoUrl) {
        try {
          await this.imagesService.deleteFromCloudinary(user.fotoUrl);
        } catch (error) {
          // Log del error pero no fallar la operación
          console.warn('No se pudo eliminar la imagen anterior de Cloudinary:', error);
        }
      }

      // Subir nueva imagen a Cloudinary
      const cloudinaryResponse = await this.imagesService.uploadFile(file, 'usuarios/perfiles');

      // Actualizar el campo fotoUrl del usuario
      user.fotoUrl = cloudinaryResponse.secure_url;
      await this.usuariosRepository.save(user);

      return {
        message: "Foto de perfil actualizada exitosamente",
        fotoUrl: cloudinaryResponse.secure_url,
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          fotoUrl: user.fotoUrl,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error al procesar la imagen: ${error.message}`);
    }
  }

  /**
   * Crea el único usuario SUPER_ADMIN del sistema
   * Este método solo puede ejecutarse una vez y solo si no existe ningún SUPER_ADMIN
   * @param dto Datos del super administrador
   * @returns Usuario SUPER_ADMIN creado con su token
   * @throws HttpException si ya existe un SUPER_ADMIN o si faltan datos
   */
  async createSuperAdmin(dto: CreateSuperAdminDTO) {
    // 1. Verificar que no exista ya un SUPER_ADMIN
    const existingSuperAdmin = await this.usuarioRolRepository.findOne({
      where: { rol: { nombre: "SUPER-ADMIN" } },
      relations: ["rol", "usuario"]
    });

    if (existingSuperAdmin) {
      throw new HttpException(
        "Ya existe un usuario SUPER_ADMIN en el sistema",
        HttpStatus.CONFLICT
      );
    }

    // 2. Verificar que no exista un usuario con el mismo email
    const existingUser = await this.usuariosRepository.findOne({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw new HttpException(
        "Ya existe un usuario con ese email",
        HttpStatus.CONFLICT
      );
    }

    // 3. Crear el rol SUPER-ADMIN si no existe
    let superAdminRole = await this.rolesRepository.findOne({
      where: { nombre: "SUPER-ADMIN" }
    });

    if (!superAdminRole) {
      superAdminRole = this.rolesRepository.create({
        nombre: "SUPER-ADMIN",
        descripcion: "Administrador supremo del sistema con acceso total",
        activo: true
      });
      await this.rolesRepository.save(superAdminRole);
    }

    // 4. Crear el usuario
    const usuario = this.usuariosRepository.create({
      nombre: dto.name,
      apellido: dto.lastName,
      email: dto.email,
      password: dto.password,
      telefono: dto.phone ? parseInt(dto.phone) : undefined,
      dni: dto.dni ? parseInt(dto.dni) : undefined,
      direccion: dto.address,
      estadoConfirmacion: true,
      activo: true
    });

    await this.usuariosRepository.save(usuario);

    // 5. Asignar el rol SUPER-ADMIN al usuario
    const usuarioRol = this.usuarioRolRepository.create({
      usuario: usuario,
      rol: superAdminRole
    });

    await this.usuarioRolRepository.save(usuarioRol);

    // 6. Generar token JWT
    const payload = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      roles: ["SUPER-ADMIN"]
    };

    const token = this.jwtService.sign(payload);

    return {
      message: "Usuario SUPER_ADMIN creado exitosamente",
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        dni: usuario.dni,
        direccion: usuario.direccion,
        rol: "SUPER-ADMIN"
      },
      token
    };
  }
}
