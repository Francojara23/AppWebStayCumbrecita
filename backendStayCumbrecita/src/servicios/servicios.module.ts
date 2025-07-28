import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicioCatalogo } from './entidades/servicio-catalogo.entity';
import { HospedajeServicio } from './entidades/hospedaje-servicio.entity';
import { HabitacionServicio } from './entidades/habitacion-servicio.entity';
import { ServiciosService } from './servicios.service';
import { ServiciosController } from './servicios.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServicioCatalogo,
      HospedajeServicio,
      HabitacionServicio
    ]),
  ],
  controllers: [ServiciosController],
  providers: [ServiciosService],
  exports: [TypeOrmModule, ServiciosService],
})
export class ServiciosModule {}
