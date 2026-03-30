import { Controller, Post, Get, Patch, Param, Body } from "@nestjs/common";
import { PlayerService } from "./player.service";

@Controller("players")
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post("join")
  join(
    @Body("joinCode") joinCode: string,
    @Body("nickname") nickname: string,
  ) {
    return this.playerService.joinSession(joinCode, nickname);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.playerService.getPlayer(id);
  }

  @Get("session/:sessionId")
  findBySession(@Param("sessionId") sessionId: string) {
    return this.playerService.getPlayerInSession(sessionId);
  }

  @Patch(":id/role")
  assingRole(@Param("id") id: string, @Body('roleId') roleId: string ) {
    return this.playerService.assignRole(id, roleId);
  }
}
