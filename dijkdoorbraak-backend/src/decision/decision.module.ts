import { Module } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { DecisionController } from './decision.controller';

@Module({
  providers: [DecisionService],
  controllers: [DecisionController],
  exports: [DecisionService],
})
export class DecisionModule {}
