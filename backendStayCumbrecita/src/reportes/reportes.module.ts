import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { RefreshViewsTask } from './tasks/refresh-views.task';

// Importar entidades necesarias para los reportes
import { Reserva } from '../reservas/entidades/reserva.entity';
import { ReservaLinea } from '../reservas/entidades/reserva-linea.entity';
import { Pago } from '../pagos/entidades/pago.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { HabitacionEntity } from '../habitaciones/entidades/habitacion.entity';
import { Usuario } from '../users/users.entity';
import { TipoHabitacionEntity } from '../habitaciones/entidades/tipo-habitacion.entity';
import { Empleado } from '../empleados/entidades/empleado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reserva,
      ReservaLinea,
      Pago,
      Hospedaje,
      HabitacionEntity,
      Usuario,
      TipoHabitacionEntity,
      Empleado,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService, RefreshViewsTask],
  exports: [ReportesService],
})
export class ReportesModule {}
