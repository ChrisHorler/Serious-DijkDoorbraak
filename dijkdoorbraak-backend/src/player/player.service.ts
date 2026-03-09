import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SessionStatus } from "@prisma/client";

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  async joinSession(joinCode: string, nickname: string) {
    const session = await this.prisma.db.session.findUnique({
      where: { joinCode },
    });

    if (!session) {
      throw new NotFoundException("Invalid join code");
    }

    if (session.status !== SessionStatus.LOBBY) {
      throw new BadRequestException("Session is no longer acccepting players");
    }

    const existingPlayer = await this.prisma.db.player.findFirst({
      where: { sessionId: session.id, nickname },
    });

    if (existingPlayer) {
      throw new BadRequestException("Nickname already taken in this session");
    }

    return this.prisma.db.player.create({
      data: {
        sessionId: session.id,
        nickname,
      },
      include: {
        session: true,
      },
    });
  }

  async getPlayer(id: string) {
    const player = await this.prisma.db.player.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!player) throw new NotFoundException("Player not found");
    return player;
  }

  async assignRole(playerId: string, roleId: string) {
  const player = await this.prisma.db.player.findUnique({
    where: { id: playerId },
  });
  if (!player) throw new NotFoundException('Player not found');

  return this.prisma.db.player.update({
    where: { id: playerId },
    data: {
      role: { connect: { id: roleId } },
    },
    include: { role: true },
  });
}

  async getPlayerInSession(sessionId: string) {
    return this.prisma.db.player.findMany({
      where: { sessionId },
      include: { role: true },
      orderBy: { joinedAt: "asc" },
    });
  }
}
