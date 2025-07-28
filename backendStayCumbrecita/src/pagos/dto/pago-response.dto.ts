import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPago, MetodoPago } from '../entidades/pago.entity';

export class PagoResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  reservaId?: string | null;

  @ApiProperty({ enum: MetodoPago })
  metodo: MetodoPago;

  @ApiProperty({ enum: EstadoPago })
  estado: EstadoPago;

  @ApiProperty()
  montoReserva: number;

  @ApiProperty()
  montoImpuestos: number;

  @ApiProperty()
  montoTotal: number;

  @ApiProperty()
  fechaPago: Date;
} 