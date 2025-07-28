import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateRoleDTO {
  @ApiProperty({ description: "Nombre del rol", required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ description: "Descripción del rol", required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
} 