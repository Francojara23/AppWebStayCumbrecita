import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservasService } from "./reservas.service";
import { ReservasController } from "./reservas.controller";
import { Reserva } from "./entidades/reserva.entity";
import { ReservaLinea } from "./entidades/reserva-linea.entity";

import { HuespedReserva } from "./entidades/huesped-reserva.entity";
import { TarjetaCheckin } from "../tarjetas/entidades/tarjeta-checkin.entity";
import { HabitacionesModule } from "../habitaciones/habitaciones.module";
import { HospedajesModule } from "../hospedajes/hospedajes.module";
import { NotificacionesModule } from "../notificaciones/notificaciones.module";
import { PagosModule } from "../pagos/pagos.module";
import { QrCodeModule } from "../qr-code/qr-code.module";
import { TarjetasModule } from "../tarjetas/tarjetas.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva, ReservaLinea, HuespedReserva, TarjetaCheckin]),
    forwardRef(() => HabitacionesModule),
    forwardRef(() => HospedajesModule),
    NotificacionesModule,
    QrCodeModule,
    forwardRef(() => PagosModule),
    TarjetasModule,
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
