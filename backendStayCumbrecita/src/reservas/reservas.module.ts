import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservasService } from "./reservas.service";
import { ReservasController } from "./reservas.controller";
import { Reserva } from "./entidades/reserva.entity";
import { ReservaLinea } from "./entidades/reserva-linea.entity";
import { Acompaniante } from "./entidades/acompaniante.entity";
import { HuespedReserva } from "./entidades/huesped-reserva.entity";
import { HabitacionesModule } from "../habitaciones/habitaciones.module";
import { HospedajesModule } from "../hospedajes/hospedajes.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { PagosModule } from "../pagos/pagos.module";
import { QrCodeModule } from "../qr-code/qr-code.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva, ReservaLinea, Acompaniante, HuespedReserva]),
    forwardRef(() => HabitacionesModule),
    HospedajesModule,
    NotificacionesModule,
    QrCodeModule,
    forwardRef(() => PagosModule),
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
