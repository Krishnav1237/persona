import { Controller, Get, Post, Delete, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeploymentService } from './deployment.service';
import { Channel } from '@prisma/client';

class CreateDeploymentDto {
  personaId: string;
  channel: Channel;
  config: any;
}

@ApiTags('deployments')
@Controller('deployments')
@ApiBearerAuth()
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  async create(@Body() dto: CreateDeploymentDto) {
    return this.deploymentService.createDeployment(dto.personaId, dto.channel, dto.config);
  }

  @Get('persona/:personaId')
  @ApiOperation({ summary: 'Get all deployments for a persona' })
  async findAllByPersona(@Param('personaId') personaId: string) {
    return this.deploymentService.findAllByPersona(personaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment by ID' })
  async findOne(@Param('id') id: string) {
    return this.deploymentService.findOne(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle deployment active status' })
  async toggleActive(@Param('id') id: string) {
    return this.deploymentService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deployment' })
  async remove(@Param('id') id: string) {
    await this.deploymentService.delete(id);
    return { message: 'Deployment deleted successfully' };
  }
}
