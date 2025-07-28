import { Controller } from '@nestjs/common';
import { ConsultasService } from './consultas.service';

@Controller('consultas')
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}
}
