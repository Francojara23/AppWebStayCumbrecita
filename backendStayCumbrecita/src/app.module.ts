import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { UsersModule } from "./users/users.module";
import { RolesModule } from "./roles/roles.module";
import { AuthModule } from "./auth/auth.module";
import { OwnersModule } from "./owners/owners.module";
import { ChatbotModule } from "./chatbot/chatbot.module";
import { HospedajesModule } from "./hospedajes/hospedajes.module";
import { HabitacionesModule } from "./habitaciones/habitaciones.module";
import { TiposHospedajeModule } from "./tipos-hospedaje/tipos-hospedaje.module";
import { TiposHabitacionModule } from "./tipos-habitacion/tipos-habitacion.module";
import { ServiciosModule } from "./servicios/servicios.module";
import { PublicidadModule } from "./publicidad/publicidad.module";
import { ReservasModule } from "./reservas/reservas.module";
import { PagosModule } from "./pagos/pagos.module";
import { TarjetasModule } from "./tarjetas/tarjetas.module";
import { EmpleadosModule } from "./empleados/empleados.module";
import { ConsultasModule } from "./consultas/consultas.module";
import { OpinionesModule } from "./opiniones/opiniones.module";
import { NotificacionesModule } from "./notificaciones/notificaciones.module";
import { ReportesModule } from "./reportes/reportes.module";
import { UploadsModule } from "./uploads/uploads.module";
import { MailModule } from "./mail/mail.module";
import { MailService } from "./mail/mail.service";

@Module({
  imports: [
    // Configuración del módulo de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Hace que las variables de entorno estén disponibles en toda la aplicación
      envFilePath: ".env", // Ruta del archivo de variables de entorno
    }),

    // Configuración del módulo de tareas programadas
    ScheduleModule.forRoot(),

    // Configuración de la conexión a la base de datos PostgreSQL principal
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres", // Tipo de base de datos
        host: config.get("DB_HOST"), // Host de la base de datos
        port: config.get<number>("DB_PORT"), // Puerto de la base de datos
        username: config.get("DB_USERNAME"), // Usuario de la base de datos
        password: config.get("DB_PASSWORD"), // Contraseña de la base de datos
        database: config.get("DB_DATABASE"), // Nombre de la base de datos
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        autoLoadEntities: true, // Carga automáticamente las entidades (solo para desarrollo)
        synchronize: true, // Sincroniza el esquema de la base de datos (solo para desarrollo)
      }),
    }),


    // Configuración de uploads PRIMERO (providers de Cloudinary)
    UploadsModule,
    
    // Módulos de negocio
    UsersModule,
    RolesModule,
    AuthModule,
    OwnersModule,
    ReportesModule,
    ChatbotModule,
    HospedajesModule,
    HabitacionesModule,
    TiposHospedajeModule,
    TiposHabitacionModule,
    ServiciosModule,
    PublicidadModule,
    ReservasModule,
    PagosModule,
    TarjetasModule,
    EmpleadosModule,
    ConsultasModule,
    OpinionesModule,
    NotificacionesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [MailService],
})
export class AppModule {}
