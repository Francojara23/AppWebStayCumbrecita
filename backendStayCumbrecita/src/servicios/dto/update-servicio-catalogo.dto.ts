import { PartialType } from '@nestjs/swagger';
import { CreateServicioCatalogoDto } from './create-servicio-catalogo.dto';

export class UpdateServicioCatalogoDto extends PartialType(CreateServicioCatalogoDto) {} 