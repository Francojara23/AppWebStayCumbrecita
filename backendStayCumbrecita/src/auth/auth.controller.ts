/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Get, Post, Patch, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { register } from "module";
import { AuthService } from "./auth.service";
import { RegisterAuthDTO } from "./dto/register-auth.dto";
import { LoginAuthDTO } from "./dto/login-auth.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { ChangePasswordDTO } from "./dto/change-password.dto";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "./jwt/jwt-auth.guard";
import { RolesGuard } from "./jwt/jwt-roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { GetUser } from "../common/decorators/get-user.decorator";
import { CreateSuperAdminDTO } from "./dto/create-superadmin.dto";

/**
 * Controlador que maneja las peticiones HTTP relacionadas con la autenticación.
 * Incluye endpoints para registro, login, verificación de email y gestión de contraseñas.
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registra un nuevo usuario en el sistema.
   * @param userDTO - Datos del usuario a registrar
   * @returns Usuario creado con su token JWT
   */
  @Post("register") //http://localhost:3000/auth/register -> POST
  @ApiOperation({ summary: "Registrar un usuario" })
  @ApiResponse({ status: 200, description: "Registro exitoso" })
  register(@Body() userDTO: RegisterAuthDTO) {
    return this.authService.register(userDTO);
  }

  /**
   * Autentica un usuario y genera su token JWT.
   * @param loginDTO - Credenciales de acceso
   * @returns Datos del usuario y token JWT
   */
  @Post("login") //http://localhost:3000/login -> POST
  @ApiOperation({ summary: "Iniciar sesión" })
  @ApiResponse({ status: 200, description: "Inicio de sesión exitoso" })
  login(@Body() loginDTO: LoginAuthDTO) {
    return this.authService.login(loginDTO);
  }

  @Patch("password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Cambiar contraseña" })
  @ApiResponse({ status: 200, description: "Contraseña actualizada exitosamente" })
  changePassword(@GetUser('id') userId: string, @Body() dto: ChangePasswordDTO) {
    return this.authService.changePassword(userId, dto);
  }

  /**
   * Solicita el reseteo de contraseña enviando un email.
   * @param dto - Datos para recuperar contraseña
   * @returns Mensaje de confirmación
   */
  @Post("password/forgot")
  @ApiOperation({ summary: "Solicitar reseteo de contraseña" })
  @ApiResponse({ status: 200, description: "Si el email existe, se enviarán instrucciones" })
  forgotPassword(@Body() dto: ForgotPasswordDTO) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Resetea la contraseña usando un token válido.
   * @param dto - Datos para resetear contraseña
   * @returns Mensaje de confirmación
   */
  @Post("password/reset")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Resetear contraseña con token" })
  @ApiResponse({ status: 200, description: "Contraseña reseteada exitosamente" })
  resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Verifica el email de un usuario usando el token.
   * @param token - Token de verificación
   * @returns Mensaje de confirmación
   */
  @Get("verify-email")
  @ApiOperation({ summary: "Verificar email" })
  @ApiResponse({ status: 200, description: "Email verificado exitosamente" })
  @ApiResponse({ status: 400, description: "Token de verificación inválido" })
  verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * Reenvía el email de verificación al usuario.
   * Requiere autenticación JWT.
   * @param req - Request con datos del usuario
   * @returns Mensaje de confirmación
   */
  @Post("verify-email/resend")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Reenviar email de verificación" })
  @ApiResponse({ status: 200, description: "Email de verificación reenviado exitosamente" })
  resendVerificationEmail(@GetUser('id') userId: string) {
    return this.authService.resendVerificationEmail(userId);
  }

  /**
   * Renueva el token JWT del usuario.
   * Requiere autenticación JWT.
   * @param req - Request con datos del usuario
   * @returns Nuevo token JWT
   */
  @Post("refresh")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Renovar token JWT" })
  @ApiResponse({ status: 200, description: "Token renovado exitosamente" })
  refreshToken(@GetUser('id') userId: string) {
    return this.authService.refreshToken(userId);
  }

  /**
   * Obtiene el perfil del usuario autenticado.
   * Requiere autenticación JWT.
   * @param req - Request con datos del usuario
   * @returns Datos del perfil
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Obtener perfil del usuario autenticado" })
  @ApiResponse({ status: 200, description: "Perfil obtenido exitosamente" })
  getProfile(@GetUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Actualizar perfil del usuario autenticado" })
  @ApiResponse({ status: 200, description: "Perfil actualizado exitosamente" })
  updateProfile(@GetUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  /**
   * Actualiza únicamente la foto de perfil del usuario autenticado.
   * Sube la imagen a Cloudinary y actualiza el campo fotoUrl.
   * @param userId - ID del usuario autenticado
   * @param file - Archivo de imagen a subir
   * @returns Confirmación y nueva URL de la foto
   */
  @Patch("meImagenUpdate")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Actualizar foto de perfil del usuario autenticado" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen para la foto de perfil (formatos: jpg, jpeg, png, gif)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Foto de perfil actualizada exitosamente" })
  @ApiResponse({ status: 400, description: "Error en la subida de archivo o formato no válido" })
  updateProfileImage(@GetUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo de imagen');
    }
    return this.authService.updateProfileImage(userId, file);
  }

  /**
   * Crea el único usuario SUPER_ADMIN del sistema.
   * Este endpoint solo puede ejecutarse una vez y es para inicialización del sistema.
   * @param dto - Datos del super administrador
   * @returns Usuario SUPER_ADMIN creado con su token
   */
  @Post("create-superadmin")
  @ApiOperation({ 
    summary: "Crear usuario SUPER_ADMIN", 
    description: "Endpoint especial para crear el único usuario SUPER_ADMIN del sistema. Solo puede ejecutarse una vez." 
  })
  @ApiResponse({ status: 201, description: "Usuario SUPER_ADMIN creado exitosamente" })
  @ApiResponse({ status: 409, description: "Ya existe un usuario SUPER_ADMIN en el sistema" })
  createSuperAdmin(@Body() dto: CreateSuperAdminDTO) {
    return this.authService.createSuperAdmin(dto);
  }
}
