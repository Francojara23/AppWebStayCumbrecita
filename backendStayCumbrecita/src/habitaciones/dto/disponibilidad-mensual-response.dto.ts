import { ApiProperty } from '@nestjs/swagger';

export class HabitacionDisponibilidadMensualDto {
  @ApiProperty({ description: 'ID de la habitación' })
  habitacion_id: string;

  @ApiProperty({ description: 'Nombre de la habitación' })
  nombre: string;

  @ApiProperty({ description: 'Tipo de habitación' })
  tipo_habitacion: string;

  @ApiProperty({ 
    description: 'Array de fechas disponibles en formato YYYY-MM-DD',
    type: [String],
    example: ['2025-07-01', '2025-07-03', '2025-07-15']
  })
  dias_disponibles: string[];

  @ApiProperty({ description: 'Cantidad total de días disponibles en el mes' })
  total_dias_disponibles: number;
}

export class DisponibilidadMensualResponseDto {
  @ApiProperty({ description: 'Mes consultado en formato YYYY-MM' })
  mes: string;

  @ApiProperty({ description: 'Año consultado' })
  año: number;

  @ApiProperty({ description: 'Mes consultado (1-12)' })
  mes_numero: number;

  @ApiProperty({ description: 'Total de días en el mes' })
  dias_en_mes: number;

  @ApiProperty({ 
    description: 'Habitaciones con disponibilidad en el mes',
    type: [HabitacionDisponibilidadMensualDto]
  })
  habitaciones_disponibles: HabitacionDisponibilidadMensualDto[];

  @ApiProperty({ description: 'Total de habitaciones con alguna disponibilidad' })
  total_habitaciones_disponibles: number;
}

export class DisponibilidadMultipleMesesResponseDto {
  @ApiProperty({ 
    description: 'Disponibilidad por mes',
    type: [DisponibilidadMensualResponseDto]
  })
  meses: DisponibilidadMensualResponseDto[];

  @ApiProperty({ description: 'Total de meses consultados' })
  total_meses: number;

  @ApiProperty({ description: 'Resumen de disponibilidad general' })
  resumen: {
    meses_con_disponibilidad: number;
    habitaciones_con_disponibilidad: string[];
  };
} 