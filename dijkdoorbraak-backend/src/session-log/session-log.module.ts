import { Module } from '@nestjs/common';
import { SessionLogService } from './session-log.service';
import { SessionLogController } from './session-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [SessionLogService],
    controllers: [SessionLogController],
    exports: [SessionLogService],
})
export class SessionLogModule {}
