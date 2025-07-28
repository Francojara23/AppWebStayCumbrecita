import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoHospedaje } from '../hospedajes/entidades/tipo-hospedaje.entity';
import { TiposHospedajeService } from './tipos-hospedaje.service';
import { TiposHospedajeController } from './tipos-hospedaje.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipoHospedaje]),
    forwardRef(() => AuthModule),
  ],
  controllers: [TiposHospedajeController],
  providers: [TiposHospedajeService],
  exports: [TypeOrmModule, TiposHospedajeService],
})
export class TiposHospedajeModule {} 