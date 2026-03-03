import { Module } from "@nestjs/common";
import { InjectService } from "./inject.service";
import { InjectController } from "./inject.controller";

@Module({
  controllers: [InjectController],
  providers: [InjectService],
  exports: [InjectService],
})
export class InjectModule {}
