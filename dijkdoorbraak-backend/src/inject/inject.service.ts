import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class InjectService {
  constructor(private readonly prisma: PrismaService) {}

  async createInject(data: {
    scenarioId: string;
    title: string;
    content: string;
    triggerTime: number;
    targetRole?: string;
  }) {
    const scenario = await this.prisma.db.scenario.findUnique({
      where: { id: data.scenarioId },
    });

    if (!scenario) throw new NotFoundException("Scenario not found");

    return this.prisma.db.inject.create({ data });
  }

  async getInjectsForScenario(scenarioId: string) {
    return this.prisma.db.inject.findMany({
      where: { scenarioId },
      orderBy: { triggerTime: "asc" },
    });
  }

  async getInject(id: string) {
    const inject = await this.prisma.db.inject.findUnique({ where: { id } });

    if (!inject) throw new NotFoundException("Inject not found");

    return inject;
  }

  async updateInject(id: string, data: {
    title?: string;
    content?: string;
    triggerTime?: number;
    targetRole?: string | null;
  }) {
    return this.prisma.db.inject.update({ where: { id }, data });
  }

  async deleteInject(id: string) {
    return this.prisma.db.inject.delete({ where: { id } });
  }
}
