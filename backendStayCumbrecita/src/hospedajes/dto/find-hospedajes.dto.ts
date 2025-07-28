import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { EstadoHospedaje } from "../entidades/hospedaje.entity";

export class FindHospedajesDTO {
  @ApiProperty({ description: "Número de página", required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: "Cantidad de elementos por página", required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({ description: "ID del tipo de hotel", required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tipoHotelId?: number;

  @ApiProperty({ description: "Estado del hospedaje", enum: EstadoHospedaje, required: false })
  @IsOptional()
  @IsEnum(EstadoHospedaje)
  estado?: EstadoHospedaje;

  @ApiProperty({ description: "Término de búsqueda", required: false })
  @IsOptional()
  @IsString()
  search?: string;
} 