import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpinionesService } from './opiniones.service';
import { OpinionesController } from './opiniones.controller';
import { Opinion } from './entidades/opinion.entity';
import { Reserva } from '../reservas/entidades/reserva.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { Usuario } from '../users/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Opinion, Reserva, Hospedaje, Usuario])
  ],
  controllers: [OpinionesController],
  providers: [OpinionesService],
  exports: [OpinionesService],
})
export class OpinionesModule {}
