import { Controller, Get, Param } from '@nestjs/common';
import { SessionLogService } from './session-log.service';

@Controller('sessions/:sessionId/log')
export class SessionLogController {
    constructor(private readonly service: SessionLogService) {}

    @Get()
    getLog(@Param('sessionId') sessionId: string) {
        return this.service.getForSession(sessionId);
    }
}
