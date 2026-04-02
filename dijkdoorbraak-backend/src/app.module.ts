import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { SessionModule } from "./session/session.module";
import { PlayerModule } from "./player/player.module";
import { InjectModule } from "./inject/inject.module";
import { ScenarioEngineModule } from "./scenario-engine/scenario-engine.module";
import { RoleModule } from './role/role.module';
import { DecisionModule } from './decision/decision.module';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FeedbackQuestionModule } from './feedback-question/feedback-question.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SessionModule,
    PlayerModule,
    InjectModule,
    ScenarioEngineModule,
    RoleModule,
    DecisionModule,
    AuthModule,
    FeedbackModule,
    FeedbackQuestionModule,
  ],
})
export class AppModule {}
