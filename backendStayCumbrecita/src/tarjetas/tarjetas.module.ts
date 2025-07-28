import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TarjetasService } from './tarjetas.service';
import { TarjetasController } from './tarjetas.controller';
import { Tarjeta } from './entidades/tarjeta.entity';

/**
 * Módulo que maneja la validación y gestión de tarjetas
 * Expone endpoints protegidos solo para SUPER_ADMIN
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Tarjeta])
  ],
  controllers: [TarjetasController],
  providers: [TarjetasService],
  exports: [TarjetasService]
})
export class TarjetasModule {} 