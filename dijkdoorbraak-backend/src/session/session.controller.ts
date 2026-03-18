import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionStatus } from '@prisma/client';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  create(@Body('scenarioId') scenarioId: string) {
    return this.sessionService.createSession(scenarioId);
  }

  @Get()
  findAll() {
    return this.sessionService.listSessions();
  }

  @Get('scenarios/all')
  getScenarios() {
    return this.sessionService.getScenarios();
  }

  @Get('scenarios/:id')
  getScenario(@Param('id') id: string) {
    return this.sessionService.getScenario(id);
  }

  @Post('scenarios')
  createScenario(@Body() body: { title: string; description?: string }) {
    return this.sessionService.createScenario(body);
  }

  @Patch('scenarios/:id')
  updateScenario(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.sessionService.updateScenario(id, body);
  }

  @Delete('scenarios/:id')
  deleteScenario(@Param('id') id: string) {
    return this.sessionService.deleteScenario(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionService.getSession(id);
  }

  @Get('join/:code')
  findByCode(@Param('code') code: string) {
    return this.sessionService.getSessionByJoinCode(code);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SessionStatus,
  ) {
    return this.sessionService.updateStatus(id, status);
  }
}
