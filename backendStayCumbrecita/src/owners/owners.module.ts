import { forwardRef, Module } from "@nestjs/common";
import { OwnersController } from "./owners.controller";
import { OwnersService } from "./owners.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Owner } from "./owners.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([Owner]), forwardRef(() => AuthModule)],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [TypeOrmModule, OwnersService],
})
export class OwnersModule {}
