import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePermisoDTO {
  @ApiProperty({ description: "Nombre del permiso" })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: "Descripción del permiso", required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
} 