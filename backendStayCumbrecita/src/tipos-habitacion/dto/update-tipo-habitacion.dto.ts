import { PartialType } from '@nestjs/swagger';
import { CreateTipoHabitacionDto } from './create-tipo-habitacion.dto';

export class UpdateTipoHabitacionDto extends PartialType(CreateTipoHabitacionDto) {} 