import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { SessionModule } from "./session/session.module";
import { PlayerModule } from "./player/player.module";
import { InjectModule } from "./inject/inject.module";
import { ScenarioEngineModule } from "./scenario-engine/scenario-engine.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SessionModule,
    PlayerModule,
    InjectModule,
    ScenarioEngineModule,
  ],
})
export class AppModule {}
