import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Server } from "socket.io";
import { PlayerService } from "./player/player.service";
import { SessionService } from "./session/session.service";
import { SessionStatus } from "@prisma/client";
import { ScenarioEngineService } from "./scenario-engine/scenario-engine.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3001);

  const httpServer = app.getHttpServer();
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const scenarioEngine = app.get(ScenarioEngineService);
  scenarioEngine.setIo(io);

  const playerService = app.get(PlayerService);
  const sessionService = app.get(SessionService);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_lobby", async (data, callback) => {
      console.log("join_lobby received:", data);
      try {
        const player = await playerService.joinSession(
          data.joinCode,
          data.nickname,
        );
        socket.join(player.sessionId);
        socket.data.playerId = player.id;
        socket.data.sessionId = player.sessionId;

        const players = await playerService.getPlayerInSession(
          player.sessionId,
        );
        io.to(player.sessionId).emit("lobby_updated", { players });

        if (callback) callback({ success: true, player });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on("assign_role", async (data, callback) => {
      console.log("assign_role received:", data);
      try {
        const player = await playerService.assignRole(data.playerId, data.role);
        const players = await playerService.getPlayerInSession(
          player.sessionId,
        );

        io.to(player.sessionId).emit("lobby_updated", { players });
        io.to(player.sessionId).emit("role_assigned", {
          playerId: player.id,
          role: player.role,
        });

        if (callback) callback({ success: true, player });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on("start_scenario", async (data, callback) => {
      console.log("start_scenario received:", data);
      try {
        const session = await sessionService.updateStatus(
          data.sessionId,
          SessionStatus.RUNNING,
        );

        await scenarioEngine.startScenario(session.id, session.scenarioId);
        io.to(data.sessionId).emit("scenario_started", { session });

        if (callback) callback({ success: true, session });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
bootstrap();
