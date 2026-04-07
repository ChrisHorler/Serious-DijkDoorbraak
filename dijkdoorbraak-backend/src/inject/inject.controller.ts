import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
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
    variant?: string;
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

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: { title?: string; content?: string; triggerTime?: number; targetRole?: string | null; variant?: string },
  ) {
    return this.injectService.updateInject(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.injectService.deleteInject(id);
  }
}
