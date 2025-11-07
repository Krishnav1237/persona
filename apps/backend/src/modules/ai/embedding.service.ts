import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const openaiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
      this.logger.log('Embedding service initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not found - Embedding features will be unavailable');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-small',
  ): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY.');
    }

    try {
      const response = await this.openai.embeddings.create({
        model,
        input: text,
      });

      const embedding = response.data[0].embedding;

      return {
        embedding,
        model: response.model,
        tokensUsed: response.usage.total_tokens,
      };
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'text-embedding-3-small',
  ): Promise<EmbeddingResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY.');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      // OpenAI supports batch embeddings, but we should chunk large batches
      const BATCH_SIZE = 100;
      const results: EmbeddingResult[] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);

        const response = await this.openai.embeddings.create({
          model,
          input: batch,
        });

        const batchResults = response.data.map((item) => ({
          embedding: item.embedding,
          model: response.model,
          tokensUsed: response.usage.total_tokens / batch.length, // Approximate per-text tokens
        }));

        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to generate batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find most similar text from a list
   */
  async findMostSimilar(
    query: string,
    candidates: string[],
    topK: number = 5,
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    if (candidates.length === 0) {
      return [];
    }

    // Generate embeddings for query and candidates
    const queryEmbedding = await this.generateEmbedding(query);
    const candidateEmbeddings = await this.generateEmbeddings(candidates);

    // Calculate similarities
    const similarities = candidateEmbeddings.map((candidate, index) => ({
      text: candidates[index],
      similarity: this.cosineSimilarity(queryEmbedding.embedding, candidate.embedding),
      index,
    }));

    // Sort by similarity (descending) and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get embedding dimensions for a model
   */
  getEmbeddingDimensions(model: string = 'text-embedding-3-small'): number {
    const dimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };

    return dimensions[model] || 1536;
  }
}
