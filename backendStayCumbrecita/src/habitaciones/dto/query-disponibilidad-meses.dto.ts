import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsNumber, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDisponibilidadMesesDto {
  @ApiProperty({ 
    description: 'Array de meses en formato YYYY-MM separados por coma', 
    example: '2025-07,2025-08,2025-09',
    type: String
  })
  @IsString()
  @Matches(/^(\d{4}-\d{2})(,\d{4}-\d{2})*$/, {
    message: 'Los meses deben estar en formato YYYY-MM,YYYY-MM'
  })
  meses: string;

  @ApiProperty({ 
    description: 'Número de página', 
    default: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Límite de resultados por página', 
    default: 10,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  /**
   * Convierte el string de meses en un array de objetos {año, mes}
   */
  getMesesArray(): Array<{año: number, mes: number}> {
    return this.meses.split(',').map(mesStr => {
      const [año, mes] = mesStr.trim().split('-');
      return {
        año: parseInt(año),
        mes: parseInt(mes)
      };
    });
  }
} 