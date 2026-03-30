import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoleService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllRoles() {
        return this.prisma.db.role.findMany({
            include: { abilities: true },
            orderBy: { name: "asc" },
        });
    }

    async getRole(id: string) {
        const role = await this.prisma.db.role.findUnique({
            where: { id },
            include: { abilities: true },
        });

        if (!role) throw new NotFoundException("Role not found");
        return role;
    }

    async getRoleByShortName(shortName: string) {
        const role = await this.prisma.db.role.findUnique({
            where: { shortName },
            include: { abilities: true },
        });

        if (!role) throw new NotFoundException("Role not found");
        return role;
    }

    async getAbilitiesForRole(roleId: string) {
        const role = await this.prisma.db.role.findUnique({
            where: { id: roleId },
            include: { abilities: true },
        });

        if (!role) throw new NotFoundException("Role not found");
        return role.abilities;
    }

    async createRole(data: { name: string; shortName: string; description?: string; briefing?: string }) {
        return this.prisma.db.role.create({ data: { ...data, description: data.description ?? '' }, include: { abilities: true } });
    }

    async updateRole(id: string, data: { name?: string; shortName?: string; description?: string; briefing?: string }) {
        return this.prisma.db.role.update({ where: { id }, data, include: { abilities: true } });
    }

    async deleteRole(id: string) {
        return this.prisma.db.role.delete({ where: { id } });
    }

    async createAbility(roleId: string, data: { name: string; description?: string }) {
        return this.prisma.db.ability.create({ data: { ...data, roleId } });
    }

    async updateAbility(id: string, data: { name?: string; description?: string }) {
        return this.prisma.db.ability.update({ where: { id }, data });
    }

    async deleteAbility(id: string) {
        return this.prisma.db.ability.delete({ where: { id } });
    }
}



