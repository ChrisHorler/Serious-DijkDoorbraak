import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DecisionService {
    constructor(private readonly prisma: PrismaService) {}

    async recordDecision(data: {
        playerId: string;
        sessionId: string;
        injectId?: string;
        abilityId?: string;
        customAction?: string;
    }) {
        const player = await this.prisma.db.player.findUnique({
            where: { id: data.playerId },
        });

        if (!player) throw new NotFoundException("Player not found");

        return this.prisma.db.decision.create({
            data: {
                playerId: data.playerId,
                sessionId: data.sessionId,
                injectId: data.injectId,
                abilityId: data.abilityId,
                customAction: data.customAction,
            },
            include: {
                ability: true,
            },
        });
    }

    async respondToCustomAction(decisionId: string, data: {
        adminResponse: string;
        adminApproved: boolean;
        score?: number;
    }) {
        const decision = await this.prisma.db.decision.findUnique({
            where: { id: decisionId },
        });

        if (!decision) throw new NotFoundException("Decision not found");

        return this.prisma.db.decision.update({
            where: { id: decisionId },
            data: {
                adminResponse: data.adminResponse,
                adminApproved: data.adminApproved,
                score: data.score,
            },
            include: { ability: true },
        });
    }

    async scoreDecision(decisionId: string, score: number) {
        return this.prisma.db.decision.update({
            where: { id: decisionId },
            data: { score },
        });
    }

    async getDecisionsForSession(sessionId: string) {
        return this.prisma.db.decision.findMany({
            where: { sessionId },
            include: {
                player: true,
                ability: true,
            },
            orderBy: { timestamp: 'asc' },
        });
    }

    async getDecisionsForPlayer(playerId: string) {
        return this.prisma.db.decision.findMany({
            where: { playerId },
            include: { ability: true },
            orderBy: { timestamp: 'asc' },
        });
    }
}