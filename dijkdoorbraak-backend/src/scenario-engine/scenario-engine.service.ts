import { Injectable } from "@nestjs/common";
import { InjectService } from "src/inject/inject.service";
import { PlayerService } from "src/player/player.service";
import { Server } from "socket.io";

@Injectable()
export class ScenarioEngineService {
  private io: Server;
  private activeTimers: Map<string, NodeJS.Timeout[]> = new Map();

  constructor(
    private readonly injectService: InjectService,
    private readonly playerService: PlayerService,
  ) {}

  setIo(io: Server) {
    this.io = io;
  }

  async startScenario(sessionId: string, scenarioId: string) {
    const injects = await this.injectService.getInjectsForScenario(scenarioId);
    const timers: NodeJS.Timeout[] = [];

    for (const inject of injects) {
      const timer = setTimeout(async () => {
        await this.fireInject(sessionId, inject);
      }, inject.triggerTime * 1000);

      timers.push(timer);
    }

    this.activeTimers.set(sessionId, timers);
    console.log(
      `Scenario started for session ${sessionId} - ${injects.length} injects scheduled`,
    );
  }

  async fireInject(
    sessionId: string,
    inject: {
      id: string;
      title: string;
      content: string;
      targetRole: string | null;
    },
  ) {
    console.log(`Firing inject "${inject.title}" for session ${sessionId}`);

    if (inject.targetRole) {
      // Deliver only to players with matching targetRole
      const players = await this.playerService.getPlayerInSession(sessionId);
      const targets = players.filter((p) => p.role === inject.targetRole);

      for (const player of targets) {
        this.io.to(sessionId).emit("inject_received", {
          playerId: player.id,
          inject,
        });
      }
    } else {
      this.io.to(sessionId).emit("inject_received", { inject });
    }
  }

  stopScenario(sessionId: string) {
    const timers = this.activeTimers.get(sessionId);

    if (timers) {
      timers.forEach(clearTimeout);
      this.activeTimers.delete(sessionId);
      console.log(`Scenario stopped for session ${sessionId}`);
    }
  }
}
