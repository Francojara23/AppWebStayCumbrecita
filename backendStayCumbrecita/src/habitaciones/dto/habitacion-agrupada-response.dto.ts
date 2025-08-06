import { ApiProperty } from '@nestjs/swagger';

export class HabitacionAgrupadaDto {
  @ApiProperty({ description: 'ID representativo del grupo (primera habitación)' })
  id: string;

  @ApiProperty({ description: 'Nombre base de las habitaciones (sin numeración)' })
  nombre: string;

  @ApiProperty({ description: 'Descripción corta' })
  descripcionCorta: string;

  @ApiProperty({ description: 'Descripción larga' })
  descripcionLarga: string;

  @ApiProperty({ description: 'Capacidad de personas por habitación' })
  capacidad: number;

  @ApiProperty({ description: 'Precio base por noche' })
  precioBase: number;

  @ApiProperty({ description: 'Ajustes de precio aplicables', type: Array })
  ajustesPrecio: any[];

  @ApiProperty({ description: 'Cantidad total de habitaciones con este nombre' })
  cantidadTotal: number;

  @ApiProperty({ description: 'Cantidad disponible en las fechas consultadas' })
  cantidadDisponible: number;

  @ApiProperty({ 
    description: 'IDs de las habitaciones individuales disponibles',
    type: [String]
  })
  habitacionesDisponiblesIds: string[];

  @ApiProperty({ description: 'Información del tipo de habitación' })
  tipoHabitacion: any;

  @ApiProperty({ description: 'Imágenes de la habitación' })
  imagenes: any[];

  @ApiProperty({ description: 'Servicios de la habitación' })
  servicios: any[];

  @ApiProperty({ description: 'Información del hospedaje' })
  hospedaje: any;
}

export class HabitacionesAgrupadasResponseDto {
  @ApiProperty({ 
    description: 'Lista de habitaciones agrupadas',
    type: [HabitacionAgrupadaDto]
  })
  data: HabitacionAgrupadaDto[];

  @ApiProperty({ description: 'Información de paginación' })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
} 