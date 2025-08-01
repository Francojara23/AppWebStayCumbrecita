import { SetMetadata } from "@nestjs/common";
import { Role } from "../../common/enums/role.enum";

export const HasRoles = (...roles: Role[]) => SetMetadata("roles", roles);
