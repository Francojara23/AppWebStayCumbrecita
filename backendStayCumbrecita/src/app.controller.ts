// src/app.controller.ts
import { Controller, Get, Redirect } from "@nestjs/common";

@Controller()
export class AppController {
  // Redirige permanentemente (301) o temporalmente (302) a /api
  @Get()
  @Redirect("/api", 302) // <- /api es donde SwaggerModule.setup("api", …) lo montó
  root(): void {
    // No hace falta lógica aquí
  }
}
