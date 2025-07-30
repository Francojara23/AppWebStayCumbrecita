import { Module, forwardRef } from "@nestjs/common";
import { HospedajesService } from "./hospedajes.service";
import { HospedajesController } from "./hospedajes.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Hospedaje } from "./entidades/hospedaje.entity";
import { ImagenHospedaje } from "./entidades/imagen-hospedaje.entity";
import { DocumentoHospedaje } from "./entidades/documento-hospedaje.entity";
import { HospedajeServicio } from "../servicios/entidades/hospedaje-servicio.entity";
import { TipoHospedaje } from "./entidades/tipo-hospedaje.entity";

import { Empleado } from "src/empleados/entidades/empleado.entity";
import { HabitacionEntity } from "src/habitaciones/entidades/habitacion.entity";
import { ImagesModule } from "../uploads/images/images.module";
import { DocumentsModule } from "../uploads/documents/documents.module";
import { EmpleadosModule } from "../empleados/empleados.module";
import { PublicidadModule } from "../publicidad/publicidad.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hospedaje,
      ImagenHospedaje,
      DocumentoHospedaje,
      HospedajeServicio,
      TipoHospedaje,
      Empleado,
      HabitacionEntity,
    ]),
    ImagesModule,
    DocumentsModule,
    EmpleadosModule,
    forwardRef(() => PublicidadModule),
  ],
  controllers: [HospedajesController],
  providers: [HospedajesService],
  exports: [TypeOrmModule, HospedajesService],
})
export class HospedajesModule {}
