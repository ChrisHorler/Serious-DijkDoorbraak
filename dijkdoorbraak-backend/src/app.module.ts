import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { SessionModule } from "./session/session.module";
import { PlayerModule } from "./player/player.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SessionModule,
    PlayerModule,
  ],
})
export class AppModule {}
