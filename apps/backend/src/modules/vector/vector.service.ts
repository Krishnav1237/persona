import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private client: QdrantClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get('QDRANT_URL', 'http://localhost:6333');
    const apiKey = this.configService.get('QDRANT_API_KEY');

    this.client = new QdrantClient({
      url,
      apiKey: apiKey || undefined,
    });
  }

  async onModuleInit() {
    try {
      // Test connection by getting cluster info
      await this.client.getCollections();
      this.logger.log('Successfully connected to Qdrant');
    } catch (error) {
      this.logger.error('Failed to connect to Qdrant', error);
      throw error;
    }
  }

  /**
   * Create a new collection for a persona
   */
  async createCollection(
    collectionName: string,
    vectorSize: number = 1536, // OpenAI text-embedding-3-small default
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine',
  ): Promise<void> {
    try {
      // Check if collection already exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (exists) {
        this.logger.warn(`Collection ${collectionName} already exists`);
        return;
      }

      await this.client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance,
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      this.logger.log(`Created collection: ${collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to create collection ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
      this.logger.log(`Deleted collection: ${collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to delete collection ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Insert vectors into a collection
   */
  async upsertVectors(collectionName: string, points: VectorPoint[]): Promise<string[]> {
    try {
      const formattedPoints = points.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points: formattedPoints,
      });

      this.logger.log(`Upserted ${points.length} vectors to ${collectionName}`);
      return points.map((p) => p.id);
    } catch (error) {
      this.logger.error(`Failed to upsert vectors to ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    collectionName: string,
    queryVector: number[],
    limit: number = 5,
    filter?: Record<string, any>,
  ): Promise<SearchResult[]> {
    try {
      const searchResult = await this.client.search(collectionName, {
        vector: queryVector,
        limit,
        filter: filter || undefined,
        with_payload: true,
      });

      return searchResult.map((result) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as Record<string, any>,
      }));
    } catch (error) {
      this.logger.error(`Failed to search in ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Hybrid search: Vector similarity + keyword matching
   */
  async hybridSearch(
    collectionName: string,
    queryVector: number[],
    keywords?: string,
    limit: number = 5,
  ): Promise<SearchResult[]> {
    try {
      const filter = keywords
        ? {
            should: [
              {
                key: 'text',
                match: {
                  text: keywords,
                },
              },
            ],
          }
        : undefined;

      return await this.search(collectionName, queryVector, limit, filter);
    } catch (error) {
      this.logger.error(`Failed to perform hybrid search in ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(collectionName: string, ids: string[]): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: ids,
      });

      this.logger.log(`Deleted ${ids.length} vectors from ${collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors from ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName: string) {
    try {
      return await this.client.getCollection(collectionName);
    } catch (error) {
      this.logger.error(`Failed to get info for collection ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Count points in a collection
   */
  async countPoints(collectionName: string): Promise<number> {
    try {
      const info = await this.getCollectionInfo(collectionName);
      return info.points_count || 0;
    } catch (error) {
      this.logger.error(`Failed to count points in ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Get a specific point by ID
   */
  async getPoint(collectionName: string, id: string): Promise<VectorPoint | null> {
    try {
      const result = await this.client.retrieve(collectionName, {
        ids: [id],
        with_payload: true,
        with_vector: true,
      });

      if (result.length === 0) return null;

      const point = result[0];
      return {
        id: point.id as string,
        vector: Array.isArray(point.vector) ? point.vector : [],
        payload: point.payload as Record<string, any>,
      };
    } catch (error) {
      this.logger.error(`Failed to get point ${id} from ${collectionName}`, error);
      throw error;
    }
  }

  /**
   * Create an index for faster filtering
   */
  async createPayloadIndex(
    collectionName: string,
    fieldName: string,
    fieldType: 'keyword' | 'integer' | 'float' | 'geo' = 'keyword',
  ): Promise<void> {
    try {
      await this.client.createPayloadIndex(collectionName, {
        field_name: fieldName,
        field_schema: fieldType,
      });

      this.logger.log(`Created payload index on ${fieldName} in ${collectionName}`);
    } catch (error) {
      this.logger.error(`Failed to create payload index in ${collectionName}`, error);
      throw error;
    }
  }
}
