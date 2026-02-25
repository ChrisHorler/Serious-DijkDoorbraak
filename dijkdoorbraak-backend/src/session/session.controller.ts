import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
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
