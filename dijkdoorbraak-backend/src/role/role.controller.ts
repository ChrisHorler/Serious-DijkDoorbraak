import { Controller, Get, Param } from "@nestjs/common";
import { RoleService } from "./role.service";

@Controller("roles")
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Get()
    findAll() {
        return this.roleService.getAllRoles();
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.roleService.getRole(id);
    }

    @Get(":id/abilities")
    getAbilities(@Param("id") id: string) {
        return this.roleService.getAbilitiesForRole(id);
    }
}