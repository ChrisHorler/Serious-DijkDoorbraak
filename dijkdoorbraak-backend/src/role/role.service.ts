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
}



