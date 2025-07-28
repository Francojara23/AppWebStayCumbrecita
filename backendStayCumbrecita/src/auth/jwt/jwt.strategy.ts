/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtConstants } from "./jwt.constants";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primero intenta extraer del header Authorization
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Si no, intenta extraer de la cookie auth_token
        (request: Request) => {
          return request?.cookies?.auth_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }
  async validate(payload: any) {
    return {
      id: payload.id,
      nombre: payload.nombre,
      apellido: payload.apellido,
      roles: payload.roles,
    };
  }
}
