import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
    constructor(private readonly prisma: PrismaService) {}

    async submitFeedback(sessionId: string, nickname: string, rating: number, comment?: string) {
        return this.prisma.db.feedback.create({
            data: { sessionId, nickname, rating, comment },
        });
    }

    async getFeedbackForSession(sessionId: string) {
        return this.prisma.db.feedback.findMany({
            where: { sessionId },
            orderBy: { submittedAt: 'asc' },
        });
    }
}
