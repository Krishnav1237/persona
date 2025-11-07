import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VectorService } from '../vector/vector.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { Persona } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PersonaService {
  private readonly logger = new Logger(PersonaService.name);

  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
  ) {}

  /**
   * Create a new persona
   */
  async create(userId: string, createPersonaDto: CreatePersonaDto): Promise<Persona> {
    this.logger.log(`Creating persona for user ${userId}`);

    // Default tone configuration if not provided
    const defaultToneConfig = {
      formality: 5,
      humor: 5,
      technical: 5,
      empathy: 5,
      energy: 5,
    };

    // Default guardrails if not provided
    const defaultGuardrails = {
      topicsToAvoid: [],
      brandValues: [],
      responseLimits: {
        maxLength: 2000,
      },
    };

    // Generate a unique collection name for Qdrant
    const qdrantCollection = `persona_${uuidv4()}`;

    try {
      // Create Qdrant collection for this persona
      await this.vectorService.createCollection(qdrantCollection);

      // Create persona in database
      const persona = await this.prisma.persona.create({
        data: {
          name: createPersonaDto.name,
          description: createPersonaDto.description,
          avatar: createPersonaDto.avatar,
          systemPrompt: createPersonaDto.systemPrompt || this.buildDefaultSystemPrompt(createPersonaDto.name),
          toneConfig: createPersonaDto.toneConfig || defaultToneConfig,
          guardrails: createPersonaDto.guardrails || defaultGuardrails,
          memoryEnabled: createPersonaDto.memoryEnabled ?? true,
          memoryRetention: createPersonaDto.memoryRetention || 90,
          qdrantCollection,
          userId,
          teamId: createPersonaDto.teamId,
        },
      });

      this.logger.log(`Successfully created persona ${persona.id}`);
      return persona;
    } catch (error) {
      this.logger.error(`Failed to create persona:`, error);

      // Cleanup: Delete Qdrant collection if database insert failed
      try {
        await this.vectorService.deleteCollection(qdrantCollection);
      } catch (cleanupError) {
        this.logger.error(`Failed to cleanup Qdrant collection:`, cleanupError);
      }

      throw error;
    }
  }

  /**
   * Find all personas for a user
   */
  async findAllByUser(userId: string): Promise<Persona[]> {
    return this.prisma.persona.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            deployments: true,
            conversations: true,
          },
        },
      },
    });
  }

  /**
   * Find one persona by ID
   */
  async findOne(id: string, userId: string): Promise<Persona> {
    const persona = await this.prisma.persona.findFirst({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        deployments: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            conversations: true,
            messages: true,
          },
        },
      },
    });

    if (!persona) {
      throw new NotFoundException(`Persona ${id} not found`);
    }

    // Check ownership (allow if user owns it or it's public)
    if (persona.userId !== userId && !persona.isPublic) {
      throw new ForbiddenException('You do not have access to this persona');
    }

    return persona;
  }

  /**
   * Update a persona
   */
  async update(id: string, userId: string, updatePersonaDto: UpdatePersonaDto): Promise<Persona> {
    // Check ownership
    const persona = await this.findOne(id, userId);

    if (persona.userId !== userId) {
      throw new ForbiddenException('You can only update your own personas');
    }

    // Build update data
    const updateData: any = {
      ...updatePersonaDto,
    };

    // If system prompt is being updated, merge with existing
    if (updatePersonaDto.systemPrompt) {
      updateData.systemPrompt = updatePersonaDto.systemPrompt;
    }

    // Update tone config if provided
    if (updatePersonaDto.toneConfig) {
      updateData.toneConfig = {
        ...(persona.toneConfig as object),
        ...updatePersonaDto.toneConfig,
      };
    }

    // Update guardrails if provided
    if (updatePersonaDto.guardrails) {
      updateData.guardrails = {
        ...(persona.guardrails as object),
        ...updatePersonaDto.guardrails,
      };
    }

    return this.prisma.persona.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a persona
   */
  async remove(id: string, userId: string): Promise<void> {
    // Check ownership
    const persona = await this.findOne(id, userId);

    if (persona.userId !== userId) {
      throw new ForbiddenException('You can only delete your own personas');
    }

    // Delete Qdrant collection
    if (persona.qdrantCollection) {
      try {
        await this.vectorService.deleteCollection(persona.qdrantCollection);
      } catch (error) {
        this.logger.error(`Failed to delete Qdrant collection for persona ${id}:`, error);
        // Continue with database deletion even if Qdrant fails
      }
    }

    // Delete persona (cascades to documents, deployments, etc.)
    await this.prisma.persona.delete({
      where: { id },
    });

    this.logger.log(`Deleted persona ${id}`);
  }

  /**
   * Get persona statistics
   */
  async getStats(id: string, userId: string) {
    const persona = await this.findOne(id, userId);

    const [
      messageCount,
      conversationCount,
      deploymentCount,
      documentCount,
      vectorCount,
    ] = await Promise.all([
      this.prisma.message.count({ where: { personaId: id } }),
      this.prisma.conversation.count({ where: { personaId: id } }),
      this.prisma.deployment.count({ where: { personaId: id, isActive: true } }),
      this.prisma.document.count({ where: { personaId: id, status: 'COMPLETED' } }),
      persona.qdrantCollection
        ? this.vectorService.countPoints(persona.qdrantCollection)
        : 0,
    ]);

    return {
      personaId: id,
      name: persona.name,
      stats: {
        totalMessages: messageCount,
        totalConversations: conversationCount,
        activeDeployments: deploymentCount,
        documentsProcessed: documentCount,
        vectorsStored: vectorCount,
      },
      createdAt: persona.createdAt,
    };
  }

  /**
   * Build a default system prompt based on persona name and tone
   */
  private buildDefaultSystemPrompt(name: string): string {
    return `You are ${name}, an AI assistant representing a brand or individual. Your goal is to communicate authentically while maintaining the brand's voice, values, and personality.

Guidelines:
- Be helpful, informative, and engaging
- Stay true to the brand's tone and values
- If you don't know something, admit it rather than making up information
- Keep responses concise but complete
- Adapt your communication style to match the conversation context

Remember: You are representing a brand, so professionalism and authenticity are key.`;
  }

  /**
   * Build the full system prompt by combining base prompt with tone config
   */
  buildSystemPrompt(persona: Persona): string {
    const basePrompt = persona.systemPrompt || this.buildDefaultSystemPrompt(persona.name);
    const toneConfig = persona.toneConfig as any;
    const guardrails = persona.guardrails as any;

    let fullPrompt = basePrompt + '\n\n';

    // Add tone configuration
    fullPrompt += '## Tone Configuration\n';
    if (toneConfig.formality <= 3) {
      fullPrompt += '- Use casual, conversational language\n';
    } else if (toneConfig.formality >= 7) {
      fullPrompt += '- Use professional, formal language\n';
    }

    if (toneConfig.humor >= 7) {
      fullPrompt += '- Feel free to be playful and use humor when appropriate\n';
    } else if (toneConfig.humor <= 3) {
      fullPrompt += '- Maintain a serious, straightforward tone\n';
    }

    if (toneConfig.technical >= 7) {
      fullPrompt += '- Use technical terminology and detailed explanations\n';
    } else if (toneConfig.technical <= 3) {
      fullPrompt += '- Keep explanations simple and avoid jargon\n';
    }

    if (toneConfig.empathy >= 7) {
      fullPrompt += '- Show empathy and warmth in your responses\n';
    }

    if (toneConfig.energy >= 7) {
      fullPrompt += '- Be enthusiastic and energetic in your communication\n';
    } else if (toneConfig.energy <= 3) {
      fullPrompt += '- Maintain a calm, measured tone\n';
    }

    // Add guardrails
    if (guardrails.topicsToAvoid && guardrails.topicsToAvoid.length > 0) {
      fullPrompt += '\n## Topics to Avoid\n';
      fullPrompt += 'Do not engage with the following topics:\n';
      guardrails.topicsToAvoid.forEach((topic: string) => {
        fullPrompt += `- ${topic}\n`;
      });
    }

    if (guardrails.brandValues && guardrails.brandValues.length > 0) {
      fullPrompt += '\n## Brand Values\n';
      fullPrompt += 'Always reflect these core values:\n';
      guardrails.brandValues.forEach((value: string) => {
        fullPrompt += `- ${value}\n`;
      });
    }

    return fullPrompt;
  }
}
