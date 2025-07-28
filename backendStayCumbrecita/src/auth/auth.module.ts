import { forwardRef, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtModule } from "@nestjs/jwt";
import { jwtConstants } from "./jwt/jwt.constants";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "../users/users.entity";
import { Rol } from "../roles/roles.entity";
import { UsuarioRol } from "../users/usersRoles.entity";
import { Owner } from "../owners/owners.entity";
import { Hospedaje } from "../hospedajes/entidades/hospedaje.entity";
import { Empleado } from "../empleados/entidades/empleado.entity";
import { RolesService } from "src/roles/roles.service";
import { JwtStrategy } from "./jwt/jwt.strategy";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "src/users/users.module";
import { UsersService } from "src/users/users.service";
import { OwnersService } from "../owners/owners.service";
import { OwnersModule } from "../owners/owners.module";
import { MailModule } from "src/mail/mail.module";
import { ImagesModule } from "src/uploads/images/images.module";
import { AutoRefreshInterceptor } from "./interceptors/auto-refresh.interceptor";
import { AutoRefreshUtil } from "./utils/auto-refresh.util";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Rol,
      UsuarioRol,
      Owner,
      Hospedaje,
      Empleado,
    ]),
    forwardRef(() => OwnersModule),
    PassportModule,
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: "12h" },
    }),

    MailModule,
    ImagesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RolesService,
    JwtStrategy,
    UsersService,
    OwnersService,
    AutoRefreshInterceptor,
    AutoRefreshUtil,
  ],
  exports: [JwtModule, AuthService, AutoRefreshUtil],
})
export class AuthModule {}
