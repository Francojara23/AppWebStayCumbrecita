import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoHabitacionEntity } from '../habitaciones/entidades/tipo-habitacion.entity';
import { TiposHabitacionService } from './tipos-habitacion.service';
import { TiposHabitacionController } from './tipos-habitacion.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoHabitacionEntity]),
    forwardRef(() => AuthModule),
  ],
  controllers: [TiposHabitacionController],
  providers: [TiposHabitacionService],
  exports: [TypeOrmModule, TiposHabitacionService],
})
export class TiposHabitacionModule {} 