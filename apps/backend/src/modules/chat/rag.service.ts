import { Injectable, Logger } from '@nestjs/common';
import { VectorService } from '../vector/vector.service';
import { EmbeddingService } from '../ai/embedding.service';
import { CacheService } from '../cache/cache.service';

export interface RetrievedContext {
  text: string;
  source: string;
  score: number;
  vectorId: string;
}

export interface RAGResult {
  contexts: RetrievedContext[];
  contextText: string;
  vectorIds: string[];
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private vectorService: VectorService,
    private embeddingService: EmbeddingService,
    private cacheService: CacheService,
  ) {}

  /**
   * Retrieve relevant context for a query using RAG
   */
  async retrieveContext(
    query: string,
    qdrantCollection: string,
    limit: number = 5,
    minScore: number = 0.7,
  ): Promise<RAGResult> {
    try {
      // Check cache first
      const cacheKey = `rag:${qdrantCollection}:${query}`;
      const cached = await this.cacheService.get<RAGResult>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for query: ${query.substring(0, 50)}...`);
        return cached;
      }

      // Generate embedding for the query
      const { embedding } = await this.embeddingService.generateEmbedding(query);

      // Search for similar vectors
      const searchResults = await this.vectorService.search(
        qdrantCollection,
        embedding,
        limit,
      );

      // Filter by minimum score and map to context objects
      const contexts: RetrievedContext[] = searchResults
        .filter((result) => result.score >= minScore)
        .map((result) => ({
          text: result.payload.text as string,
          source: result.payload.source as string || result.payload.filename as string || 'unknown',
          score: result.score,
          vectorId: result.id,
        }));

      // Combine contexts into a single text block
      const contextText = contexts.length > 0
        ? contexts.map((ctx, idx) => `[Context ${idx + 1} - Score: ${ctx.score.toFixed(2)}]\n${ctx.text}`).join('\n\n---\n\n')
        : '';

      const result: RAGResult = {
        contexts,
        contextText,
        vectorIds: contexts.map((ctx) => ctx.vectorId),
      };

      // Cache the result for 5 minutes
      await this.cacheService.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error(`Failed to retrieve context for query:`, error);
      // Return empty context on error
      return {
        contexts: [],
        contextText: '',
        vectorIds: [],
      };
    }
  }

  /**
   * Retrieve context from conversation history
   */
  async retrieveConversationContext(
    conversationId: string,
    limit: number = 10,
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const cacheKey = `conversation:${conversationId}:messages`;
      const cached = await this.cacheService.lrange<{ role: string; content: string }>(
        cacheKey,
        -limit,
        -1,
      );

      return cached;
    } catch (error) {
      this.logger.error(`Failed to retrieve conversation context:`, error);
      return [];
    }
  }

  /**
   * Build enhanced context by combining knowledge base and conversation history
   */
  async buildEnhancedContext(
    query: string,
    qdrantCollection: string,
    conversationId?: string,
    options?: {
      knowledgeLimit?: number;
      conversationLimit?: number;
      minScore?: number;
    },
  ): Promise<{
    knowledgeContext: string;
    conversationContext: Array<{ role: string; content: string }>;
    metadata: {
      knowledgeChunks: number;
      conversationMessages: number;
      totalTokensApprox: number;
    };
  }> {
    const { knowledgeLimit = 5, conversationLimit = 10, minScore = 0.7 } = options || {};

    // Retrieve knowledge base context
    const ragResult = await this.retrieveContext(query, qdrantCollection, knowledgeLimit, minScore);

    // Retrieve conversation history if conversation ID provided
    let conversationContext: Array<{ role: string; content: string }> = [];
    if (conversationId) {
      conversationContext = await this.retrieveConversationContext(conversationId, conversationLimit);
    }

    // Calculate approximate token count
    const knowledgeTokens = ragResult.contextText.length / 4; // Rough approximation
    const conversationTokens = conversationContext.reduce((sum, msg) => sum + msg.content.length / 4, 0);

    return {
      knowledgeContext: ragResult.contextText,
      conversationContext,
      metadata: {
        knowledgeChunks: ragResult.contexts.length,
        conversationMessages: conversationContext.length,
        totalTokensApprox: Math.round(knowledgeTokens + conversationTokens),
      },
    };
  }

  /**
   * Rerank contexts based on query relevance (simple implementation)
   */
  private rerankContexts(
    query: string,
    contexts: RetrievedContext[],
  ): RetrievedContext[] {
    // Simple keyword-based reranking
    const queryKeywords = query.toLowerCase().split(/\s+/);

    return contexts.map((context) => {
      const textLower = context.text.toLowerCase();
      let keywordMatches = 0;

      for (const keyword of queryKeywords) {
        if (textLower.includes(keyword)) {
          keywordMatches++;
        }
      }

      // Boost score based on keyword matches
      const boostedScore = context.score * (1 + keywordMatches * 0.1);

      return {
        ...context,
        score: Math.min(boostedScore, 1.0),
      };
    }).sort((a, b) => b.score - a.score);
  }
}
