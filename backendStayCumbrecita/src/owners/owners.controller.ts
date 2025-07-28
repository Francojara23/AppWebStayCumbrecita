import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { OwnersService } from "./owners.service";
import { CreateOwnerDTO } from "./dto/create-owner.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";

@ApiTags("owners")
@ApiBearerAuth("JWT-auth")
@Roles(Role.SUPER_ADMIN) // Solo usuarios con role SUPER-ADMIN podrán acceder
@Controller("owners")
export class OwnersController {
  constructor(private ownersService: OwnersService) {}

  @Post("createOwner") //http://{ipAdress}:3000/owners -> POST
  @ApiOperation({ summary: "Crear un dueño" })
  @ApiResponse({ status: 200, description: "Dueño creado exitosamente" })
  create(@Body() ownerDTO: CreateOwnerDTO) {
    return this.ownersService.create(ownerDTO);
  }

  @Get("findAllOwners") //http://{ipAdress}:3000/owners -> GET
  @ApiOperation({ summary: "Encontrar todos los dueños" })
  @ApiResponse({ status: 200, description: "Dueños encontrados exitosamente" })
  findAll() {
    return this.ownersService.findAll();
  }

  @Get("findOne/:idOwner") //http://{ipAdress}:3000/owners/1 -> GET
  @ApiOperation({ summary: "Encontrar un dueño" })
  @ApiResponse({ status: 200, description: "Dueño encontrado exitosamente" })
  findOne(@Param("idOwner") idOwner: string) {
    return this.ownersService.findOne(idOwner);
  }

  @Put("update/:idOwner") //http://{ipAdress}:3000/owners/1 -> PUT
  @ApiOperation({ summary: "Actualizar un dueño" })
  @ApiResponse({ status: 200, description: "Dueño actualizado exitosamente" })
  update(@Param("idOwner") idOwner: string, @Body() ownerDTO: CreateOwnerDTO) {
    return this.ownersService.update(idOwner, ownerDTO);
  }

  @Get("findByDni")
  @ApiOperation({ summary: "Buscar un propietario por DNI" })
  @ApiQuery({ name: 'dni', required: true, description: 'DNI del propietario' })
  @ApiResponse({ status: 200, description: "Propietario encontrado exitosamente" })
  @ApiResponse({ status: 404, description: "Propietario no encontrado" })
  findByDni(@Query('dni') dni: string) {
    return this.ownersService.findByDni(dni);
  }
}
