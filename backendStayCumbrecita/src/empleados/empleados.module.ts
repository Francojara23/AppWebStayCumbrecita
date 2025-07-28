import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpleadosService } from './empleados.service';
import { EmpleadosController, UsuarioHotelesController, EmpleadosSimpleController } from './empleados.controller';
import { Empleado } from './entidades/empleado.entity';
import { Usuario } from '../users/users.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { Rol } from '../roles/roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Empleado, Usuario, Hospedaje, Rol]),
  ],
  controllers: [EmpleadosController, UsuarioHotelesController, EmpleadosSimpleController],
  providers: [EmpleadosService],
  exports: [EmpleadosService],
})
export class EmpleadosModule {}
