import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { QrCodeService } from './qr-code.service';
import { jwtConstants } from '../auth/jwt/jwt.constants';
import { ImagesModule } from '../uploads/images/images.module';

@Module({
  imports: [
    ConfigModule,
    ImagesModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [QrCodeService],
  exports: [QrCodeService],
})
export class QrCodeModule {} 