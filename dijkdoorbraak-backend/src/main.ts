import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Server } from "socket.io";
import { PlayerService } from "./player/player.service";
import { SessionService } from "./session/session.service";
import { DecisionService } from "./decision/decision.service";
import { SessionStatus } from ".prisma/client";
import { ScenarioEngineService } from "./scenario-engine/scenario-engine.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
  })


  await app.listen(3001);

  const httpServer = app.getHttpServer();
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const scenarioEngine = app.get(ScenarioEngineService);
  scenarioEngine.setIo(io);

  const playerService = app.get(PlayerService);
  const sessionService = app.get(SessionService);
  const decisionService = app.get(DecisionService);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_lobby", async (data, callback) => {
      console.log("join_lobby received:", data);
      try {
        const player = await playerService.joinSession(data.joinCode, data.nickname);
        await playerService.updateSocketId(player.id, socket.id)
        socket.join(player.sessionId);
        socket.data.playerId = player.id;
        socket.data.sessionId = player.sessionId;

        const players = await playerService.getPlayerInSession(player.sessionId);
        io.to(player.sessionId).emit("lobby_updated", { players });

        if (callback) callback({ success: true, player });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on("assign_role", async (data, callback) => {
      console.log("assign_role received:", data);
      try {
        // data.roleId is now a Role UUID, not a string name
        const player = await playerService.assignRole(data.playerId, data.roleId);
        const players = await playerService.getPlayerInSession(player.sessionId);

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

    socket.on("submit_action", async (data, callback) => {
      console.log("submit_action received:", data);
      try {
        const decision = await decisionService.recordDecision({
          playerId: data.playerId,
          sessionId: data.sessionId,
          injectId: data.injectId,
          abilityId: data.abilityId,
          customAction: data.customAction,
        });

        // Notify everyone in session — admin sees all actions in real time
        io.to(data.sessionId).emit("action_submitted", { decision });

        if (callback) callback({ success: true, decision });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on("admin_respond", async (data, callback) => {
      console.log("admin_respond received:", data);
      try {
        const decision = await decisionService.respondToCustomAction(
          data.decisionId,
          {
            adminResponse: data.adminResponse,
            adminApproved: data.adminApproved,
            score: data.score,
          },
        );

        // Notify the session of the admin response
        io.to(data.sessionId).emit("action_response", { decision });

        if (callback) callback({ success: true, decision });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on('rejoin_lobby', async (data) => {
      const { sessionId, playerId } = data;
      socket.join(sessionId);
      socket.data.playerId = playerId;
      socket.data.sessionid = sessionId;
      try {
        await playerService.updateSocketId(playerId, socket.id);
        console.log(`Player ${playerId} rejoined room ${sessionId}`);
      } catch {
        console.log(`Player ${playerId} not found on rejoin, already removed`);
      }
    })
    
    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);

      const player = await playerService.findPlayerBySocketId(socket.id);
      if (!player) return;

      // Only remove player if session is still in lobby
      const session = await sessionService.getSession(player.sessionId);
      if (session?.status === SessionStatus.LOBBY) {
        // Mark as offline instead of deleting
        await playerService.clearSocketId(socket.id);

        const players = await playerService.getPlayerInSession(player.sessionId);
        io.to(player.sessionId).emit("lobby_updated", { players });
      }
    });
  });
}
bootstrap();