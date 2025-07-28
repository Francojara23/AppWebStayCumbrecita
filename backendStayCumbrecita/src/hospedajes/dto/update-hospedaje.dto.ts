import { PartialType } from "@nestjs/swagger";
import { CreateHospedajeDTO } from "./create-hospedaje.dto";

export class UpdateHospedajeDTO extends PartialType(CreateHospedajeDTO) {}
