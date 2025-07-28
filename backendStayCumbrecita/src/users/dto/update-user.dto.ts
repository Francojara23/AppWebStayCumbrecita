import {
  IsNumber,
  IsOptional,
  IsString,
  IsEmail,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

@ValidatorConstraint({ async: false })
class IsTenDigitsConstraint implements ValidatorConstraintInterface {
  validate(phone: unknown) {
    if (typeof phone !== "string" && typeof phone !== "number") {
      return false; // Invalid type
    }
    const phoneStr = phone.toString();
    return phoneStr.length === 10; // Verifica que la longitud sea 10
  }

  defaultMessage() {
    return "El número debe tener exactamente 10 dígitos.";
  }
}

function IsTenDigits(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTenDigitsConstraint,
    });
  };
}

export class UpdateUserDTO {
  @ApiProperty({ description: "Nombre del usuario" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "Apellido del usuario" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: "Correo electrónico" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "DNI del usuario" })
  @IsOptional()
  @IsNumber()
  dni?: number;

  @ApiProperty({ description: "Número de teléfono (10 dígitos)" })
  @IsOptional()
  @IsNumber()
  @IsTenDigits({ message: "El celular debe tener 10 dígitos." })
  phone?: number;

  @ApiProperty({ description: "Dirección del usuario" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: "URL de la foto del usuario" })
  @IsOptional()
  @IsString()
  photoUser?: string;

  @ApiProperty({ description: "Token para notificaciones" })
  @IsOptional()
  @IsString()
  notificationToken?: string;

  @ApiProperty({ description: "Nombre del usuario" })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ description: "Apellido del usuario" })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiProperty({ description: "Número de teléfono (10 dígitos)" })
  @IsOptional()
  @IsNumber()
  @IsTenDigits({ message: "El celular debe tener 10 dígitos." })
  telefono?: number;

  @ApiProperty({ description: "Dirección del usuario" })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ description: "URL de la foto del usuario" })
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @ApiProperty({ description: "Estado de confirmación" })
  @IsOptional()
  estadoConfirmacion?: boolean;
}
