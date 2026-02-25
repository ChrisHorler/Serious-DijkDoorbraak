import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PlayerService } from '../player/player.service';
import { SessionService } from './session.service';
import { SessionStatus } from '@prisma/client';

@WebSocketGateway({ cors: { origin: '*' } })
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly playerService: PlayerService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_lobby')
  async handleJoinLobby(
    @MessageBody() data: { joinCode: string; nickname: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log("join_lobby received:", data);
    try {
      const player = await this.playerService.joinSession(data.joinCode, data.nickname);

      client.join(player.sessionId);
      client.data.playerId = player.id;
      client.data.sessionId = player.sessionId;

      const players = await this.playerService.getPlayerInSession(player.sessionId);

      this.server.to(player.sessionId).emit('lobby_updated', { players });

      return { success: true, player };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('assign_role')
  async handleAssignRole(
    @MessageBody() data: { playerId: string; role: string },
  ) {
    try {
      const player = await this.playerService.assignRole(data.playerId, data.role);
      const players = await this.playerService.getPlayerInSession(player.sessionId);

      this.server.to(player.sessionId).emit('lobby_updated', { players });
      this.server.to(player.sessionId).emit('role_assigned', {
        playerId: player.id,
        role: player.role,
      });

      return { success: true, player };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('start_scenario')
  async handleStartScenario(
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const session = await this.sessionService.updateStatus(data.sessionId, SessionStatus.RUNNING);
      this.server.to(data.sessionId).emit('scenario_started', { session });
      return { success: true, session };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

