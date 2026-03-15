import { Controller, Post, Get, Patch, Param, Body } from "@nestjs/common";
import { DecisionService } from "./decision.service";

@Controller("decisions")
export class DecisionController {
    constructor(private readonly decisionService: DecisionService) {}

    @Post()
    record(@Body() body: {
        playerId: string;
        sessionId: string;
        injectId?: string;
        abilityId?: string;
        customAction?: string;
    }){
        return this.decisionService.recordDecision(body);
    }

    @Patch(":id/respond")
    respond(
        @Param("id") id: string,
        @Body() body: {
            adminResponse: string;
            adminApproved: boolean;
            score?: number;
        },
    ) {
        return this.decisionService.respondToCustomAction(id, body);
    }

    @Patch(":id/score")
    score(
        @Param("id") id: string,
        @Body("score") score: number,
    ) {
        return this.decisionService.scoreDecision(id, score);
    }

    @Get("session/:sessionId")
    findBySession(@Param("sessionId") sessionId: string) {
        return this.decisionService.getDecisionsForSession(sessionId);
    }

    @Get("player/:playerId")
    findByPlayer(@Param("playerId") playerId: string) {
        return this.decisionService.getDecisionsForPlayer(playerId);
    }
}