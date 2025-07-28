import { ApiProperty } from "@nestjs/swagger";
import { TipoNotificacion } from '../../common/enums/tipo-notificacion.enum';

/**
 * DTO que representa una notificación enviada a través de WebSocket
 * Se utiliza para documentar el formato de los mensajes en tiempo real
 */
export class WebSocketNotificationDto {
  @ApiProperty({
    description: 'ID único de la notificación',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Nueva reserva confirmada'
  })
  titulo: string;

  @ApiProperty({
    description: 'Contenido del mensaje de la notificación',
    example: 'Su reserva para el Hotel Vista Mar ha sido confirmada para el 15 de marzo'
  })
  cuerpo: string;

  @ApiProperty({
    description: 'Tipo de notificación que determina su categoría',
    enum: TipoNotificacion,
    example: TipoNotificacion.RESERVA
  })
  tipo: TipoNotificacion;

  @ApiProperty({
    description: 'Datos adicionales relacionados con la notificación',
    example: {
      reservaId: '123e4567-e89b-12d3-a456-426614174000',
      hospedajeId: '456e7890-e89b-12d3-a456-426614174001',
      fechaInicio: '2024-03-15T14:00:00Z',
      fechaFin: '2024-03-17T11:00:00Z'
    },
    required: false
  })
  data?: any;

  @ApiProperty({
    description: 'Fecha y hora de creación de la notificación',
    example: '2024-03-10T10:30:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Indica si la notificación ha sido leída',
    example: false
  })
  leida: boolean;
}
