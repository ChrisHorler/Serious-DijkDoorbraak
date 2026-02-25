import { Module } from "@nestjs/common";
import { SessionService } from "./session.service";
import { SessionController } from "./session.controller";
import { SessionGateway } from "./session/session.gateway";
import { PlayerModule } from "../player/player.module";

@Module({
  imports: [PlayerModule],
  controllers: [SessionController],
  providers: [SessionService, SessionGateway],
  exports: [SessionService],
})
export class SessionModule {}
