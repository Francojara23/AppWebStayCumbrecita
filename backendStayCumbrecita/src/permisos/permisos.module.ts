import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PermisosController } from "./permisos.controller";
import { PermisosService } from "./permisos.service";
import { Permiso } from "./entidades/permiso.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Permiso])],
  controllers: [PermisosController],
  providers: [PermisosService],
  exports: [PermisosService],
})
export class PermisosModule {} 