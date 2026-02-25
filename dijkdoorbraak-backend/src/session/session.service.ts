import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionStatus } from "@prisma/client";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(scenarioId: string) {
    const scenario = await this.prisma.db.scenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario ${scenarioId} not found`);
    }

    const joinCode = generateJoinCode();

    return this.prisma.db.session.create({
      data: {
        scenarioId,
        joinCode,
        status: SessionStatus.LOBBY,
      },
      include: {
        scenario: true,
        players: true,
      },
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.db.session.findUnique({
      where: { id },
      include: {
        scenario: true,
        players: true,
      },
    });

    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async getSessionByJoinCode(joinCode: string) {
    const session = await this.prisma.db.session.findUnique({
      where: { joinCode },
      include: {
        scenario: true,
        players: true,
      },
    });

    if (!session) throw new NotFoundException(`Invalid join code`);
    return session;
  }

  async updateStatus(id: string, status: SessionStatus) {
    return this.prisma.db.session.update({
      where: { id },
      data: {
        status,
        ...(status === SessionStatus.RUNNING && { startedAt: new Date() }),
        ...(status === SessionStatus.ENDED && { endedAt: new Date() }),
      },
    });
  }

  async listSessions() {
    return this.prisma.db.session.findMany({
      include: { scenario: true, players: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
