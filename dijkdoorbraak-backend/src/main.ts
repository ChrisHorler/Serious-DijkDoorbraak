import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Server } from "socket.io";
import { PlayerService } from "./player/player.service";
import { SessionService } from "./session/session.service";
import { DecisionService } from "./decision/decision.service";
import { FeedbackService } from "./feedback/feedback.service";
import { FeedbackQuestionService } from "./feedback-question/feedback-question.service";
import { InjectService } from "./inject/inject.service";
import { SessionStatus } from ".prisma/client";
import { ScenarioEngineService } from "./scenario-engine/scenario-engine.service";
import { verifyAdminToken } from "./auth/auth.controller";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3002', 'http://localhost:3000'];
  app.enableCors({
    origin: allowedOrigins,
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

  // Clean up any sessions left RUNNING from a previous process
  const cleaned = await sessionService.endAllRunningSessions();
  if (cleaned.count > 0) {
    console.log(`Cleaned up ${cleaned.count} stale RUNNING session(s) on startup`);
  }
  const decisionService = app.get(DecisionService);
  const feedbackService = app.get(FeedbackService);
  const feedbackQuestionService = app.get(FeedbackQuestionService);
  const injectService = app.get(InjectService);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    socket.data.isAdmin = token ? verifyAdminToken(token) : false;
    next();
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id, socket.data.isAdmin ? "(admin)" : "");

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

        // Include incident location + feedback questions so players have full context
        const scenario = await sessionService.getScenario(session.scenarioId) as any;
        const feedbackQuestions = await feedbackQuestionService.getForScenario(session.scenarioId);
        io.to(data.sessionId).emit("scenario_started", {
          session,
          incidentLat: scenario.incidentLat ?? null,
          incidentLng: scenario.incidentLng ?? null,
          feedbackQuestions,
        });

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
          actionLat: data.actionLat,
          actionLng: data.actionLng,
          actionDetail: data.actionDetail,
          actionUrgency: data.actionUrgency,
        });

        // Notify everyone in session — admin sees all actions in real time
        io.to(data.sessionId).emit("action_submitted", { decision });

        if (callback) callback({ success: true, decision });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on("submit_feedback", async (data, callback) => {
      try {
        const feedback = await feedbackService.submitFeedback(
          data.sessionId,
          data.nickname,
          data.comment,
          data.questionRatings,
        );
        io.to(data.sessionId).emit("feedback_received", { feedback });
        if (callback) callback({ success: true });
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
      socket.data.sessionId = sessionId;
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
        await playerService.removePlayerBySocketId(socket.id);
        const players = await playerService.getPlayerInSession(player.sessionId);
        io.to(player.sessionId).emit("lobby_updated", { players });
      }
    });

    socket.on('admin_join', (data: { sessionId: string }) => {
      if (!socket.data.isAdmin) return;
      socket.join(data.sessionId);
      console.log(`Admin joined room ${data.sessionId}`);
    });

    socket.on('map_update', (data: { sessionId: string; overlay: any }) => {
      if (!socket.data.isAdmin) return;
      io.to(data.sessionId).emit('map_update', { overlay: data.overlay });
    });

    socket.on('fire_inject', async (data: { sessionId: string; injectId: string }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      try {
        const inject = await injectService.getInject(data.injectId);
        await scenarioEngine.fireInject(data.sessionId, inject);
        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on('fire_custom_inject', async (data: { sessionId: string; title: string; content: string; targetRole: string | null; variant?: string }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      try {
        const inject = {
          id: crypto.randomUUID(),
          title: data.title,
          content: data.content,
          targetRole: data.targetRole || null,
          variant: data.variant ?? 'alert',
        };
        await scenarioEngine.fireInject(data.sessionId, inject);
        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on('set_overlays', (data: { sessionId: string; overlays: any[] }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      io.to(data.sessionId).emit('overlays_set', { overlays: data.overlays });
      if (callback) callback({ success: true });
    });

    socket.on('stop_scenario', async (data: { sessionId: string }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      try {
        scenarioEngine.stopScenario(data.sessionId);
        const session = await sessionService.updateStatus(data.sessionId, SessionStatus.ENDED);
        io.to(data.sessionId).emit('scenario_stopped', { session });
        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });
  });
}
bootstrap();