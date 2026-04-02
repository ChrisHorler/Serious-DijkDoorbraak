import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackQuestionService {
    constructor(private readonly prisma: PrismaService) {}

    async getForScenario(scenarioId: string) {
        return (this.prisma.db as any).feedbackQuestion.findMany({
            where: { scenarioId },
            orderBy: { order: 'asc' },
        });
    }

    async create(scenarioId: string, question: string, order: number) {
        return (this.prisma.db as any).feedbackQuestion.create({
            data: { scenarioId, question, order },
        });
    }

    async delete(id: string) {
        return (this.prisma.db as any).feedbackQuestion.delete({ where: { id } });
    }

    async reorder(items: { id: string; order: number }[]) {
        await Promise.all(
            items.map((item) =>
                (this.prisma.db as any).feedbackQuestion.update({
                    where: { id: item.id },
                    data: { order: item.order },
                }),
            ),
        );
    }
}
