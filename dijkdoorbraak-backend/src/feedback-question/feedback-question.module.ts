import { Module } from '@nestjs/common';
import { FeedbackQuestionService } from './feedback-question.service';
import { FeedbackQuestionController } from './feedback-question.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [FeedbackQuestionController],
    providers: [FeedbackQuestionService],
    exports: [FeedbackQuestionService],
})
export class FeedbackQuestionModule {}
