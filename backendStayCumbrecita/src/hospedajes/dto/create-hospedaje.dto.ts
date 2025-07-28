import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, IsNumber, IsArray } from "class-validator";
import { EstadoHospedaje } from "../entidades/hospedaje.entity";

export class CreateHospedajeDTO {
  @ApiProperty({ description: "Nombre del hospedaje" })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: "Descripción corta del hospedaje" })
  @IsNotEmpty()
  @IsString()
  descripcionCorta: string;

  @ApiProperty({ description: "Descripción larga del hospedaje" })
  @IsNotEmpty()
  @IsString()
  descripcionLarga: string;

  @ApiProperty({ description: "ID del tipo de hotel" })
  @IsNotEmpty()
  @IsString()
  tipoHotelId: string;

  @ApiProperty({ description: "ID del documento de inscripción", required: false })
  @IsOptional()
  @IsString()
  documentoInscripcion?: string;

  @ApiProperty({ description: "Nombre del responsable" })
  @IsNotEmpty()
  @IsString()
  responsable: string;

  @ApiProperty({ description: "Teléfono de contacto" })
  @IsNotEmpty()
  @IsString()
  telefonoContacto: string;

  @ApiProperty({ description: "Email de contacto" })
  @IsNotEmpty()
  @IsEmail()
  mailContacto: string;

  @ApiProperty({ description: "Dirección del hospedaje" })
  @IsNotEmpty()
  @IsString()
  direccion: string;

  @ApiProperty({ description: "Latitud del hospedaje", required: false })
  @IsOptional()
  @IsNumber()
  latitud?: number;

  @ApiProperty({ description: "Longitud del hospedaje", required: false })
  @IsOptional()
  @IsNumber()
  longitud?: number;

  @ApiProperty({ 
    description: "IDs de servicios a asignar al hospedaje",
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[];

  @ApiProperty({ description: "Estado del hospedaje", enum: EstadoHospedaje })
  @IsOptional()
  @IsEnum(EstadoHospedaje)
  estado?: EstadoHospedaje;
}
