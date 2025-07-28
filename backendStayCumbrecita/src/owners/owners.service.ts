import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Owner } from "./owners.entity";
import { Repository } from "typeorm";
import { CreateOwnerDTO } from "./dto/create-owner.dto";
import { someHashFunction } from "../common/utils/utils";

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner) private ownersRepository: Repository<Owner>,
  ) {}

  async create(ownerDTO: CreateOwnerDTO) {
    // Crea instancia de la entidad
    const owner = new Owner();
    // Copia las propiedades del DTO a la entidad
    Object.assign(owner, ownerDTO);
    // Guarda en BD (aquí se ejecutarán los hooks de la entidad)
    return this.ownersRepository.save(owner);
  }
  findAll() {
    return this.ownersRepository.find();
  }
  async findOne(idOwner: string): Promise<Owner> {
    const owner = await this.ownersRepository.findOne({
      where: { idOwner: idOwner },
    });
    if (!owner) {
      throw new Error(`Owner with id ${idOwner} not found`);
    }
    return owner;
  }
  async update(idOwner: string, ownerDTO: CreateOwnerDTO): Promise<Owner> {
    // 1. Buscar si existe
    const existingOwner = await this.ownersRepository.findOne({
      where: { idOwner },
    });
    if (!existingOwner) {
      throw new Error(`Owner with id ${idOwner} not found`);
    }
    // 2. Asignar los valores del DTO a la entidad
    Object.assign(existingOwner, ownerDTO);
    // 3. Guardar para que se ejecute @BeforeUpdate() y las transformaciones
    return this.ownersRepository.save(existingOwner);
  }

  async findByDni(dni: string): Promise<Owner> {
    const dniHash = someHashFunction(dni.trim());
    const owner = await this.ownersRepository.findOne({
      where: { dniHash },
      relations: ['hospedajes'],
    });

    if (!owner) {
      throw new NotFoundException(`No se encontró ningún propietario con el DNI ${dni}`);
    }

    return owner;
  }
}
