import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AIService, Message as AIMessage } from '../ai/ai.service';
import { PersonaService } from '../persona/persona.service';
import { ConversationService } from './conversation.service';
import { RAGService } from './rag.service';

export interface ChatRequest {
  personaId: string;
  message: string;
  deploymentId?: string;
  externalUserId?: string;
  externalUserData?: any;
  conversationId?: string;
  stream?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  response: string;
  metadata: {
    model: string;
    tokensUsed: number;
    contextChunks: number;
    processingTime: number;
  };
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private personaService: PersonaService,
    private conversationService: ConversationService,
    private ragService: RAGService,
  ) {}

  /**
   * Process a chat message and generate a response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get or create deployment
    let deploymentId = request.deploymentId;
    if (!deploymentId) {
      // Create a temporary API deployment if none specified
      deploymentId = await this.getOrCreateApiDeployment(request.personaId);
    }

    // Get or create conversation
    const conversation = request.conversationId
      ? await this.prisma.conversation.findUnique({
          where: { id: request.conversationId },
        })
      : await this.conversationService.getOrCreateConversation(
          request.personaId,
          deploymentId,
          request.externalUserId,
          request.externalUserData,
        );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Save user message
    await this.conversationService.addMessage(
      conversation.id,
      'user',
      request.message,
    );

    // Get persona
    const persona = await this.prisma.persona.findUnique({
      where: { id: request.personaId },
    });

    if (!persona) {
      throw new NotFoundException(`Persona ${request.personaId} not found`);
    }

    // Build system prompt
    const systemPrompt = this.personaService.buildSystemPrompt(persona);

    // Retrieve context using RAG
    let knowledgeContext = '';
    let contextVectors: string[] = [];

    if (persona.memoryEnabled && persona.qdrantCollection) {
      const enhancedContext = await this.ragService.buildEnhancedContext(
        request.message,
        persona.qdrantCollection,
        conversation.id,
        {
          knowledgeLimit: 5,
          conversationLimit: 10,
          minScore: 0.7,
        },
      );

      knowledgeContext = enhancedContext.knowledgeContext;

      // Get recent conversation history
      const conversationHistory = enhancedContext.conversationContext;

      // Build context-enhanced prompt
      if (knowledgeContext) {
        knowledgeContext = `\n\n## Relevant Knowledge Base Context\n${knowledgeContext}\n\n`;
      }

      this.logger.log(
        `Retrieved ${enhancedContext.metadata.knowledgeChunks} knowledge chunks and ${enhancedContext.metadata.conversationMessages} conversation messages`,
      );
    }

    // Build messages for LLM
    const messages: AIMessage[] = [];

    // Add conversation history
    const recentMessages = await this.conversationService.getRecentMessages(conversation.id, 8);

    for (const msg of recentMessages.slice(0, -1)) {
      // Exclude the message we just added
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Add current user message with context
    let userMessageWithContext = request.message;
    if (knowledgeContext) {
      userMessageWithContext = `${knowledgeContext}\nUser Question: ${request.message}`;
    }

    messages.push({
      role: 'user',
      content: userMessageWithContext,
    });

    // Generate AI response
    this.logger.log(`Generating response for persona ${persona.name}...`);

    const completion = await this.aiService.generateSmartCompletion(
      messages,
      'medium', // Default to medium complexity
      {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      },
    );

    // Save assistant message
    const assistantMessage = await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      completion.content,
      {
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        finishReason: completion.finishReason,
      },
      contextVectors,
    );

    const processingTime = Date.now() - startTime;

    this.logger.log(
      `Generated response in ${processingTime}ms using ${completion.model} (${completion.tokensUsed} tokens)`,
    );

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      response: completion.content,
      metadata: {
        model: completion.model,
        tokensUsed: completion.tokensUsed,
        contextChunks: contextVectors.length,
        processingTime,
      },
    };
  }

  /**
   * Stream a chat response (for real-time UX)
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    // Similar to chat() but uses streaming
    // For MVP, we'll implement this later

    const response = await this.chat(request);
    yield response.response;
  }

  /**
   * Get or create API deployment for a persona
   */
  private async getOrCreateApiDeployment(personaId: string): Promise<string> {
    const existing = await this.prisma.deployment.findFirst({
      where: {
        personaId,
        channel: 'API',
      },
    });

    if (existing) {
      return existing.id;
    }

    // Create new API deployment
    const deployment = await this.prisma.deployment.create({
      data: {
        personaId,
        channel: 'API',
        config: {},
        metadata: {},
      },
    });

    return deployment.id;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        persona: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  /**
   * Get all conversations for a persona
   */
  async getConversations(personaId: string, limit: number = 50) {
    return this.prisma.conversation.findMany({
      where: { personaId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
    });
  }
}
