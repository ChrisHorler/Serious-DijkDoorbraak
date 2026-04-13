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
import { SessionLogService } from "./session-log/session-log.service";
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
  const sessionLogService = app.get(SessionLogService);

  // In-memory overlay cache: sessionId → current overlays array
  // Used to restore map state for rejoining players.
  const sessionOverlays = new Map<string, any[]>();

  // In-memory timer cache: sessionId → { remainingMs, running, updatedAt }
  // Used to restore timer state for late-joining players and the screen page.
  const sessionTimers = new Map<string, { remainingMs: number; running: boolean; updatedAt: number }>();

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
        const { player, rejoined } = await playerService.joinSession(data.joinCode, data.nickname);
        await playerService.updateSocketId(player.id, socket.id);
        socket.join(player.sessionId);
        socket.data.playerId = player.id;
        socket.data.sessionId = player.sessionId;

        const players = await playerService.getPlayerInSession(player.sessionId);
        io.to(player.sessionId).emit("lobby_updated", { players });
        if (!rejoined) {
          sessionLogService.record(player.sessionId, 'player_joined', { nickname: player.nickname }).catch(() => {});
        }

        // If rejoining a running session, send back the current overlay + timer state
        // so the player's map/timer can be restored without waiting for the next admin action.
        const currentOverlays = rejoined ? (sessionOverlays.get(player.sessionId) ?? []) : [];
        const timerEntry = rejoined ? sessionTimers.get(player.sessionId) : undefined;
        let currentTimer: { remainingMs: number; running: boolean } | null = null;
        if (timerEntry) {
          const elapsed = timerEntry.running ? Date.now() - timerEntry.updatedAt : 0;
          const adjusted = Math.max(0, timerEntry.remainingMs - elapsed);
          currentTimer = { remainingMs: adjusted, running: timerEntry.running && adjusted > 0 };
        }

        if (callback) callback({ success: true, player, rejoined, currentOverlays, currentTimer });
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
        sessionLogService.record(session.id, 'scenario_started').catch(() => {});

        // Include incident location + feedback questions so players have full context
        const scenario = await sessionService.getScenario(session.scenarioId) as any;
        const feedbackQuestions = await feedbackQuestionService.getForScenario(session.scenarioId);
        io.to(data.sessionId).emit("scenario_started", {
          session,
          incidentLat: scenario.incidentLat ?? null,
          incidentLng: scenario.incidentLng ?? null,
          scenarioTime: scenario.scenarioTime ?? null,
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
        // Notify admins this player is back online (no-op during LOBBY since
        // lobby_updated covers that case; mainly useful during RUNNING)
        const sess = await sessionService.getSession(sessionId).catch(() => null);
        if (sess?.status === SessionStatus.RUNNING) {
          io.to(sessionId).emit('player_status_changed', { playerId, online: true });
        }
      } catch {
        console.log(`Player ${playerId} not found on rejoin, already removed`);
      }
    })
    
    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);

      const player = await playerService.findPlayerBySocketId(socket.id);
      if (!player) return;

      const session = await sessionService.getSession(player.sessionId);
      if (session?.status === SessionStatus.LOBBY) {
        // Remove from lobby so the player list stays clean
        await playerService.removePlayerBySocketId(socket.id);
        const players = await playerService.getPlayerInSession(player.sessionId);
        io.to(player.sessionId).emit("lobby_updated", { players });
      } else if (session?.status === SessionStatus.RUNNING) {
        // During an active scenario, clear the stale socketId so targeted injects
        // don't silently fire into a dead socket. The player will refresh their
        // socketId when they reconnect via rejoin_lobby.
        await playerService.clearSocketId(socket.id);
        io.to(player.sessionId).emit('player_status_changed', { playerId: player.id, online: false });
      }
    });

    socket.on('admin_join', (data: { sessionId: string }) => {
      if (!socket.data.isAdmin) return;
      socket.join(data.sessionId);
      console.log(`Admin joined room ${data.sessionId}`);
    });

    socket.on('map_update', (data: { sessionId: string; overlay: any }) => {
      if (!socket.data.isAdmin) return;
      const current = sessionOverlays.get(data.sessionId) ?? [];
      const exists = current.some((o: any) => o.id === data.overlay.id);
      sessionOverlays.set(data.sessionId, exists
        ? current.filter((o: any) => o.id !== data.overlay.id)
        : [...current, data.overlay]
      );
      io.to(data.sessionId).emit('map_update', { overlay: data.overlay });
    });

    socket.on('fire_inject', async (data: { sessionId: string; injectId: string }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      try {
        const inject = await injectService.getInject(data.injectId);
        await scenarioEngine.fireInject(data.sessionId, inject);
        sessionLogService.record(data.sessionId, 'inject_fired', { title: inject.title, targetRole: inject.targetRole ?? null, variant: (inject as any).variant ?? 'alert' }).catch(() => {});
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
        sessionLogService.record(data.sessionId, 'inject_fired', { title: inject.title, targetRole: inject.targetRole, variant: inject.variant, custom: true }).catch(() => {});
        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    socket.on('set_overlays', (data: { sessionId: string; overlays: any[] }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      sessionOverlays.set(data.sessionId, data.overlays);
      io.to(data.sessionId).emit('overlays_set', { overlays: data.overlays });
      if (callback) callback({ success: true });
    });

    socket.on('phase_changed', (data: { sessionId: string; phaseIndex: number; phaseName?: string }) => {
      if (!socket.data.isAdmin) return;
      socket.to(data.sessionId).emit('phase_changed', { phaseIndex: data.phaseIndex });
      sessionLogService.record(data.sessionId, 'phase_changed', { phaseIndex: data.phaseIndex, phaseName: data.phaseName ?? null }).catch(() => {});
    });

    socket.on('stop_scenario', async (data: { sessionId: string }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      try {
        scenarioEngine.stopScenario(data.sessionId);
        const session = await sessionService.updateStatus(data.sessionId, SessionStatus.ENDED);
        sessionOverlays.delete(data.sessionId);
        sessionTimers.delete(data.sessionId);
        sessionLogService.record(data.sessionId, 'scenario_stopped').catch(() => {});
        io.to(data.sessionId).emit('scenario_stopped', { session });
        if (callback) callback({ success: true });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // Admin updates timer state; relay to everyone and persist for late joiners.
    socket.on('timer_update', (data: { sessionId: string; remainingMs: number; running: boolean }, callback) => {
      if (!socket.data.isAdmin) return callback?.({ success: false, message: 'Unauthorized' });
      sessionTimers.set(data.sessionId, { remainingMs: data.remainingMs, running: data.running, updatedAt: Date.now() });
      io.to(data.sessionId).emit('timer_update', { remainingMs: data.remainingMs, running: data.running });
      if (callback) callback({ success: true });
    });

    // Spectator / screen page joins a session room to receive map + timer events.
    socket.on('spectator_join', async (data: { sessionId?: string; joinCode?: string; name?: string }, callback) => {
      try {
        let sessionId = data.sessionId;
        let sess: any;
        if (!sessionId && data.joinCode) {
          sess = await sessionService.getSessionByJoinCode(data.joinCode);
          sessionId = sess.id;
        } else if (sessionId) {
          sess = await sessionService.getSession(sessionId).catch(() => null);
        }
        if (!sessionId) return callback?.({ success: false, message: 'No session identifier provided' });
        socket.join(sessionId);
        const currentOverlays = sessionOverlays.get(sessionId) ?? [];
        const timerEntry = sessionTimers.get(sessionId);
        let currentTimer: { remainingMs: number; running: boolean } | null = null;
        if (timerEntry) {
          const elapsed = timerEntry.running ? Date.now() - timerEntry.updatedAt : 0;
          const adjusted = Math.max(0, timerEntry.remainingMs - elapsed);
          currentTimer = { remainingMs: adjusted, running: timerEntry.running && adjusted > 0 };
        }
        const players = sess ? await playerService.getPlayerInSession(sessionId) : [];
        if (callback) callback({ success: true, sessionId, session: sess, players, currentOverlays, currentTimer });
      } catch (error) {
        if (callback) callback({ success: false, message: error.message });
      }
    });
  });
}
bootstrap();