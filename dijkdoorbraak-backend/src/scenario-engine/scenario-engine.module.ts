import { Module } from "@nestjs/common";
import { ScenarioEngineService } from "./scenario-engine.service";
import { InjectModule } from "src/inject/inject.module";
import { PlayerModule } from "src/player/player.module";

@Module({
  imports: [InjectModule, PlayerModule],
  providers: [ScenarioEngineService],
  exports: [ScenarioEngineService],
})
export class ScenarioEngineModule {}
