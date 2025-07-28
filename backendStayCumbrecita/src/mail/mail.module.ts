/* eslint-disable @typescript-eslint/require-await */
import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MailService } from "./mail.service";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get("GMAIL_HOST"),
          port: configService.get("GMAIL_PORT"),
          secure: configService.get("GMAIL_SECURE") === "true",
          auth: {
            user: configService.get("GMAIL_USER"),
            pass: configService.get("GMAIL_PASS"),
          },
        },
        defaults: {
          from: configService.get("GMAIL_FROM"),
        },
        template: {
          dir: join(__dirname, "..", "..", "mail", "templates"),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
