import { PartialType } from '@nestjs/swagger';
import { CreateTipoHospedajeDto } from './create-tipo-hospedaje.dto';

export class UpdateTipoHospedajeDto extends PartialType(CreateTipoHospedajeDto) {} 