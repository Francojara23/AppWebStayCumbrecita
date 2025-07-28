import { IsOptional, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateEmpleadoDto {
  @ApiProperty({ description: "ID del rol a asignar en el hotel", required: false })
  @IsOptional()
  @IsUUID()
  rolId?: string;
}
