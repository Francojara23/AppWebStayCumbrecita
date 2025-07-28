import { IsUUID, IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoNotificacion } from '../../common/enums/tipo-notificacion.enum';

export class CreateNotificacionDto {
  @ApiProperty({ description: 'ID del usuario destinatario' })
  @IsUUID()
  usuarioId: string;

  @ApiProperty({ description: 'Título de la notificación' })
  @IsString()
  titulo: string;

  @ApiProperty({ description: 'Cuerpo del mensaje' })
  @IsString()
  cuerpo: string;

  @ApiProperty({ description: 'Tipo de notificación', enum: TipoNotificacion })
  @IsEnum(TipoNotificacion)
  tipo: TipoNotificacion;

  @ApiProperty({ description: 'Datos adicionales', required: false })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: 'Canales de envío', required: false })
  @IsOptional()
  @IsArray()
  canales?: ('IN_APP' | 'EMAIL' | 'PUSH')[];
} 