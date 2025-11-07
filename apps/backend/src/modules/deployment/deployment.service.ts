import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Channel } from '@prisma/client';

@Injectable()
export class DeploymentService {
  constructor(private prisma: PrismaService) {}

  async createDeployment(
    personaId: string,
    channel: Channel,
    config: any,
  ) {
    return this.prisma.deployment.create({
      data: {
        personaId,
        channel,
        config,
        metadata: {},
      },
    });
  }

  async findAllByPersona(personaId: string) {
    return this.prisma.deployment.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id },
      include: {
        persona: true,
      },
    });

    if (!deployment) {
      throw new NotFoundException(`Deployment ${id} not found`);
    }

    return deployment;
  }

  async toggleActive(id: string) {
    const deployment = await this.findOne(id);

    return this.prisma.deployment.update({
      where: { id },
      data: {
        isActive: !deployment.isActive,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id); // Check exists
    await this.prisma.deployment.delete({ where: { id } });
  }
}
