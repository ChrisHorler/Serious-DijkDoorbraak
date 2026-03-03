import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { InjectService } from "./inject.service";

@Controller("injects")
export class InjectController {
  constructor(private readonly injectService: InjectService) {}

  @Post()
  create(@Body() body: {
    scenarioId: string;
    title: string;
    content: string;
    triggerTime: number;
    targetRole?: string;
  }) {
    return this.injectService.createInject(body);
  }

  @Get("scenario/:scenarioId")
  findByScenario(@Param("scenarioId") scenarioId: string) {
    return this.injectService.getInjectsForScenario(scenarioId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.injectService.getInject(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.injectService.deleteInject(id);
  }
}
