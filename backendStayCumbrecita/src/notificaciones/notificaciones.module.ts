import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificacionesService } from "./notificaciones.service";
import { NotificacionesController } from "./notificaciones.controller";
import { NotificacionesGateway } from "./notificaciones.gateway";
import { Notificacion } from "./entidades/notificacion.entity";
import { Empleado } from "../empleados/entidades/empleado.entity";
import { Hospedaje } from "../hospedajes/entidades/hospedaje.entity";
import { UsersModule } from "../users/users.module";
import { MailModule } from "../mail/mail.module";
import { ConfigModule } from "@nestjs/config";
import { FcmModule } from "../fcm/fcm.module";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion, Empleado, Hospedaje]),
    UsersModule,
    MailModule,
    ConfigModule,
    FcmModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesGateway],
  exports: [NotificacionesService, NotificacionesGateway],
})
export class NotificacionesModule {}
