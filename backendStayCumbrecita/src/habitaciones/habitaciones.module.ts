import { Module, forwardRef } from "@nestjs/common";
import { HabitacionesService } from "./habitaciones.service";
import { HabitacionesController } from "./habitaciones.controller";
import { HotelHabitacionesController } from "./hotel-habitaciones.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HabitacionEntity } from "./entidades/habitacion.entity";
import { ImagenHabitacionEntity } from "./entidades/imagen-habitacion.entity";
import { TipoHabitacionEntity } from "./entidades/tipo-habitacion.entity";
import { HistorialPrecioEntity } from "./entidades/historial-precio.entity";
import { Hospedaje } from "../hospedajes/entidades/hospedaje.entity";
import { ImagesModule } from "../uploads/images/images.module";
import { HospedajesModule } from "../hospedajes/hospedajes.module";
import { EmpleadosModule } from "../empleados/empleados.module";
import { ReservasModule } from "../reservas/reservas.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HabitacionEntity,
      ImagenHabitacionEntity,
      TipoHabitacionEntity,
      HistorialPrecioEntity,
      Hospedaje,
    ]),
    ImagesModule,
    HospedajesModule,
    EmpleadosModule,
    forwardRef(() => ReservasModule),
  ],
  controllers: [HabitacionesController, HotelHabitacionesController],
  providers: [HabitacionesService],
  exports: [TypeOrmModule, HabitacionesService],
})
export class HabitacionesModule {}
