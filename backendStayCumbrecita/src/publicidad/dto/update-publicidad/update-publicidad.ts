import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { EstadoPublicidad } from '../../entidades/publicidad.entity';

export class UpdatePublicidadDto {
  @ApiPropertyOptional({ 
    description: 'Configurar renovación automática',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  renovacionAutomatica?: boolean;
}

export class CancelarPublicidadDto {
  @ApiPropertyOptional({ 
    description: 'Motivo de la cancelación',
    example: 'El usuario decidió cancelar la publicidad'
  })
  @IsOptional()
  motivoCancelacion?: string;
}
