import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "./users.entity";
import { UsuarioRol } from "./usersRoles.entity";
import { Rol } from "../roles/roles.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, UsuarioRol, Rol]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
