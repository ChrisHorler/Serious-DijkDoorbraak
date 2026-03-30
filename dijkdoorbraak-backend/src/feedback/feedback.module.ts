import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [FeedbackService],
    exports: [FeedbackService],
})
export class FeedbackModule {}
