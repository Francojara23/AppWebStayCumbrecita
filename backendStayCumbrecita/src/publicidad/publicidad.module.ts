import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicidadService } from './publicidad.service';
import { PublicidadController } from './publicidad.controller';
import { Publicidad } from './entidades/publicidad.entity';
import { Pago } from '../pagos/entidades/pago.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { Tarjeta } from '../tarjetas/entidades/tarjeta.entity';
import { Usuario } from '../users/users.entity';
import { PagosModule } from '../pagos/pagos.module';
import { TarjetasModule } from '../tarjetas/tarjetas.module';
import { HospedajesModule } from '../hospedajes/hospedajes.module';
import { EmpleadosModule } from '../empleados/empleados.module';
import { MailModule } from '../mail/mail.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Publicidad, Pago, Hospedaje, Tarjeta, Usuario]),
    PagosModule,
    TarjetasModule,
    forwardRef(() => HospedajesModule),
    EmpleadosModule,
    MailModule,
    NotificacionesModule,
  ],
  controllers: [PublicidadController],
  providers: [PublicidadService],
  exports: [PublicidadService],
})
export class PublicidadModule {}
