import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { Conversation, Message } from '@prisma/client';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly MESSAGE_CACHE_TTL = 3600; // 1 hour
  private readonly MAX_CACHED_MESSAGES = 50;

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create or get existing conversation
   */
  async getOrCreateConversation(
    personaId: string,
    deploymentId: string,
    externalUserId?: string,
    externalUserData?: any,
  ): Promise<Conversation> {
    // Try to find existing active conversation
    if (externalUserId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          personaId,
          deploymentId,
          externalUserId,
          isActive: true,
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
      });

      if (existing) {
        return existing;
      }
    }

    // Create new conversation
    return this.prisma.conversation.create({
      data: {
        personaId,
        deploymentId,
        externalUserId,
        externalUserData: externalUserData || {},
        context: {},
      },
    });
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: any,
    contextVectors?: string[],
  ): Promise<Message> {
    // Get conversation to get persona ID
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        personaId: conversation.personaId,
        role,
        content,
        metadata: metadata || {},
        contextVectors: contextVectors || [],
      },
    });

    // Update conversation metadata
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: {
          increment: 1,
        },
      },
    });

    // Cache the message for quick retrieval
    await this.cacheMessageInHistory(conversationId, role, content);

    return message;
  }

  /**
   * Get conversation history
   */
  async getHistory(
    conversationId: string,
    limit: number = 50,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get recent messages (optimized with cache)
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 10,
  ): Promise<Array<{ role: string; content: string }>> {
    const cacheKey = `conversation:${conversationId}:messages`;

    try {
      // Try to get from cache first
      const cached = await this.cacheService.lrange<{ role: string; content: string }>(
        cacheKey,
        -limit,
        -1,
      );

      if (cached && cached.length > 0) {
        return cached;
      }

      // If not in cache, get from database
      const messages = await this.getHistory(conversationId, limit);

      // Cache messages
      for (const message of messages) {
        await this.cacheMessageInHistory(conversationId, message.role, message.content);
      }

      return messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      this.logger.error(`Failed to get recent messages:`, error);
      return [];
    }
  }

  /**
   * Cache a message in conversation history
   */
  private async cacheMessageInHistory(
    conversationId: string,
    role: string,
    content: string,
  ): Promise<void> {
    const cacheKey = `conversation:${conversationId}:messages`;

    try {
      await this.cacheService.rpush(cacheKey, { role, content });

      // Trim to keep only recent messages
      await this.cacheService.ltrim(cacheKey, -this.MAX_CACHED_MESSAGES, -1);

      // Set expiration
      await this.cacheService.expire(cacheKey, this.MESSAGE_CACHE_TTL);
    } catch (error) {
      this.logger.error(`Failed to cache message:`, error);
    }
  }

  /**
   * Update message with feedback
   */
  async addFeedback(
    messageId: string,
    rating: number,
    feedback?: string,
  ): Promise<Message> {
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        rating,
        feedback,
      },
    });
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isActive: false,
      },
    });

    // Clear cache
    const cacheKey = `conversation:${conversationId}:messages`;
    await this.cacheService.del(cacheKey);
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(personaId: string) {
    const [totalConversations, activeConversations, totalMessages, avgMessagesPerConversation] =
      await Promise.all([
        this.prisma.conversation.count({
          where: { personaId },
        }),
        this.prisma.conversation.count({
          where: { personaId, isActive: true },
        }),
        this.prisma.message.count({
          where: { personaId },
        }),
        this.prisma.conversation.aggregate({
          where: { personaId },
          _avg: {
            messageCount: true,
          },
        }),
      ]);

    return {
      totalConversations,
      activeConversations,
      totalMessages,
      avgMessagesPerConversation: avgMessagesPerConversation._avg.messageCount || 0,
    };
  }

  /**
   * Generate conversation summary (for long conversations)
   */
  async generateSummary(conversationId: string): Promise<string> {
    // This would typically use an LLM to generate a summary
    // For now, return a simple summary
    const messages = await this.getHistory(conversationId, 100);

    const messageCount = messages.length;
    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter((m) => m.role === 'assistant').length;

    return `Conversation with ${messageCount} messages (${userMessages} from user, ${assistantMessages} from assistant)`;
  }
}
