import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionLogService {
    constructor(private readonly prisma: PrismaService) {}

    async record(sessionId: string, event: string, details?: Record<string, any>) {
        return (this.prisma.db as any).sessionLog.create({
            data: { id: crypto.randomUUID(), sessionId, event, details: details ?? null },
        });
    }

    async getForSession(sessionId: string) {
        return (this.prisma.db as any).sessionLog.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' },
        });
    }
}
