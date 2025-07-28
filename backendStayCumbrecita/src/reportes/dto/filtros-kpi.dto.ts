import { IsOptional, IsUUID, IsNumber, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RangoFechasDto } from "./rango-fechas.dto";

export class FiltrosKpiDto extends RangoFechasDto {
  @ApiPropertyOptional({
    description: "ID del hospedaje para filtrar (opcional)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  hotelId?: string;

  @ApiPropertyOptional({
    description: "ID del tipo de habitación para filtrar (opcional)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @ApiPropertyOptional({
    description: "Límite de resultados",
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
