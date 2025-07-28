/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Recupera la lista de roles permitidos en el endpoint
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Si no se definieron roles, se permite el acceso
    if (!requiredRoles) {
      return true;
    }

    // Toma el user
    const request = context.switchToHttp().getRequest();
    const user = request.user; // viene del JwtAuthGuard
    console.log("USER EN GUARD =>", user);
    console.log("REQUIRED ROLES =>", requiredRoles);

    if (!user || !user.roles) {
      throw new ForbiddenException("No tenés acceso");
    }

    // Verifica si alguno de los roles del usuario está en los roles permitidos
    const hasRole = user.roles.some((role: string) => requiredRoles.includes(role));
    
    if (!hasRole) {
      console.log("USER ROLES =>", user.roles);
      console.log("REQUIRED ROLES =>", requiredRoles);
      throw new ForbiddenException("No tenés acceso");
    }

    return true;
  }
}
