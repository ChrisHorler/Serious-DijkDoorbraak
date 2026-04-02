import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
    constructor(private readonly prisma: PrismaService) {}

    async submitFeedback(
        sessionId: string,
        nickname: string,
        comment?: string,
        questionRatings?: { questionId: string; question: string; rating: number }[],
    ) {
        const rating =
            questionRatings && questionRatings.length > 0
                ? Math.round(
                      questionRatings.reduce((s, q) => s + q.rating, 0) /
                          questionRatings.length,
                  )
                : null;
        return (this.prisma.db as any).feedback.create({
            data: { sessionId, nickname, rating, comment, questionRatings: questionRatings ?? [] },
        });
    }

    async getFeedbackForSession(sessionId: string) {
        return (this.prisma.db as any).feedback.findMany({
            where: { sessionId },
            orderBy: { submittedAt: 'asc' },
        });
    }
}
