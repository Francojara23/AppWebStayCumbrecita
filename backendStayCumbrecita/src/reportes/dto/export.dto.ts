import { IsString, IsIn, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExportDto {
  @ApiProperty({
    description: 'Tipo de reporte a exportar',
    enum: [
      'kpis',
      'reservations_by_month',
      'reservations_by_status',
      'revenue_by_month',
      'revenue_by_room_type',
      'occupancy_by_hotel',
      'occupancy_by_room_type',
      'tourists_by_origin',
      'top_rooms',
      'best_month'
    ],
    example: 'revenue_by_month'
  })
  @IsString()
  @IsIn([
    'kpis',
    'reservations_by_month',
    'reservations_by_status',
    'revenue_by_month',
    'revenue_by_room_type',
    'occupancy_by_hotel',
    'occupancy_by_room_type',
    'tourists_by_origin',
    'top_rooms',
    'best_month'
  ])
  report: string;

  @ApiProperty({
    description: 'Formato de exportación',
    enum: ['csv', 'xlsx'],
    example: 'csv'
  })
  @IsString()
  @IsIn(['csv', 'xlsx'])
  format: string;

  @ApiPropertyOptional({
    description: 'ID del hospedaje para filtrar (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  hotelId?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (ISO string)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (ISO string)',
    example: '2024-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  to?: string;
} 