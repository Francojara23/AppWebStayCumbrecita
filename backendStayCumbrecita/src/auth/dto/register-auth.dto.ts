/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IsAlphanumeric,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

@ValidatorConstraint({ async: false })
class IsTenDigitsConstraint implements ValidatorConstraintInterface {
  validate(phone: any, args: ValidationArguments) {
    if (typeof phone === "number" || typeof phone === "string") {
      const phoneStr = phone.toString();
      return phoneStr.length === 10; // Verifica que la longitud sea 10
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
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

@ValidatorConstraint({ async: false })
class IsEightDigitsConstraint implements ValidatorConstraintInterface {
  validate(dni: any, args: ValidationArguments) {
    if (typeof dni === "number" || typeof dni === "string") {
      const dniStr = dni.toString();
      return dniStr.length === 8; // Verifica que la longitud sea 8
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return "El número debe tener exactamente 8 dígitos."; // Mensaje actualizado
  }
}

function IsEightDigits(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEightDigitsConstraint,
    });
  };
}

export enum TipoRolRegistro {
  TURISTA = 'TURISTA',
  ADMIN = 'ADMIN'
}

export class RegisterAuthDTO {
  @ApiProperty({ description: "Nombre del usuario" })
  @IsNotEmpty()
  @IsString()
  nombre!: string;
  @ApiProperty({ description: "Apellido del usuario" })
  @IsNotEmpty()
  @IsString()
  apellido!: string;
  @ApiProperty({ description: "Correo electrónico" })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email!: string;
  @ApiProperty({ description: "Contraseña alfanumérica" })
  @IsNotEmpty()
  @IsAlphanumeric()
  @IsString()
  password!: string;
  @ApiProperty({ description: "Número de teléfono (10 dígitos)" })
  @IsNotEmpty()
  @IsNumber()
  @IsTenDigits({ message: "El celular debe tener 10 dígitos." })
  telefono!: number;
  @ApiProperty({ description: "DNI (8 dígitos)" })
  @IsNotEmpty()
  @IsNumber()
  @IsEightDigits({ message: "El DNI debe tener 8 dígitos." })
  dni!: number;
  @ApiProperty({ description: "Dirección del usuario", required: false })
  @IsOptional()
  @IsString()
  direccion?: string;
  @ApiProperty({ 
    description: "Tipo de rol del usuario", 
    enum: TipoRolRegistro,
    default: TipoRolRegistro.TURISTA
  })
  @IsEnum(TipoRolRegistro)
  @IsNotEmpty()
  tipoRegistro!: TipoRolRegistro;

  /* Solo necesario si luego se convierte en PROPIETARIO ------------- */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombreHotel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipoHotelId?: string;
}
