import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PagosService } from "./pagos.service";
import { PagosController } from "./pagos.controller";
import { Pago } from "./entidades/pago.entity";
import { HistorialEstadoPago } from "./entidades/historial-estado-pago.entity";
import { TarjetasModule } from "src/tarjetas/tarjetas.module";
import { ReservasModule } from "src/reservas/reservas.module";
import { MailModule } from "src/mail/mail.module";
import { NotificacionesModule } from "src/notificaciones/notificaciones.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Pago, HistorialEstadoPago]),
    TarjetasModule,
    forwardRef(() => ReservasModule),
    MailModule,
    NotificacionesModule,
  ],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService, TypeOrmModule],
})
export class PagosModule {}
