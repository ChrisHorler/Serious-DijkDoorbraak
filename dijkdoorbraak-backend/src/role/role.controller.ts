import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { RoleService } from "./role.service";

@Controller("roles")
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Get()
    findAll() {
        return this.roleService.getAllRoles();
    }

    @Post()
    create(@Body() body: { name: string; shortName: string; description?: string }) {
        return this.roleService.createRole(body);
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.roleService.getRole(id);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() body: { name?: string; shortName?: string; description?: string }) {
        return this.roleService.updateRole(id, body);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.roleService.deleteRole(id);
    }

    @Get(":id/abilities")
    getAbilities(@Param("id") id: string) {
        return this.roleService.getAbilitiesForRole(id);
    }

    @Post(":id/abilities")
    createAbility(@Param("id") id: string, @Body() body: { name: string; description?: string }) {
        return this.roleService.createAbility(id, body);
    }

    @Patch("abilities/:abilityId")
    updateAbility(@Param("abilityId") abilityId: string, @Body() body: { name?: string; description?: string }) {
        return this.roleService.updateAbility(abilityId, body);
    }

    @Delete("abilities/:abilityId")
    deleteAbility(@Param("abilityId") abilityId: string) {
        return this.roleService.deleteAbility(abilityId);
    }
}