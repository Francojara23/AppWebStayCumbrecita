import { IsNotEmpty, IsUUID, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateEmpleadoDto {
  @ApiProperty({ description: "ID del usuario a contratar" })
  @IsNotEmpty()
  @IsUUID()
  usuarioId: string;

  @ApiProperty({ description: "ID del rol a asignar en el hotel" })
  @IsNotEmpty()
  @IsUUID()
  rolId: string;

  @ApiProperty({ description: "ID del hospedaje donde trabajará", required: false })
  @IsOptional()
  @IsUUID()
  hospedajeId?: string;
}
