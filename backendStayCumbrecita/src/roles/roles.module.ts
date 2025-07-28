import { Module } from "@nestjs/common";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "../users/users.entity";
import { UsuarioRol } from "../users/usersRoles.entity";
import { Rol } from "./roles.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, UsuarioRol, Rol])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [TypeOrmModule, RolesService],
})
export class RolesModule {}
