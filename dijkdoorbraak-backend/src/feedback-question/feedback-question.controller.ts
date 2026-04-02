import { Controller, Get, Post, Delete, Patch, Param, Body } from '@nestjs/common';
import { FeedbackQuestionService } from './feedback-question.service';

@Controller('scenarios/:scenarioId/feedback-questions')
export class FeedbackQuestionController {
    constructor(private readonly service: FeedbackQuestionService) {}

    @Get()
    getAll(@Param('scenarioId') scenarioId: string) {
        return this.service.getForScenario(scenarioId);
    }

    @Post()
    create(
        @Param('scenarioId') scenarioId: string,
        @Body() body: { question: string; order?: number },
    ) {
        return this.service.create(scenarioId, body.question, body.order ?? 0);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }

    @Patch('reorder')
    reorder(@Body() body: { items: { id: string; order: number }[] }) {
        return this.service.reorder(body.items);
    }
}
