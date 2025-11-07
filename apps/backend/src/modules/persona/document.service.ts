import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VectorService } from '../vector/vector.service';
import { EmbeddingService } from '../ai/embedding.service';
import { DocumentProcessorService } from '../ai/document-processor.service';
import { Document, DocumentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
    private embeddingService: EmbeddingService,
    private documentProcessor: DocumentProcessorService,
  ) {}

  /**
   * Upload and process a document for a persona
   */
  async uploadDocument(
    personaId: string,
    filePath: string,
    filename: string,
    fileSize: number,
  ): Promise<Document> {
    this.logger.log(`Uploading document ${filename} for persona ${personaId}`);

    // Get persona and verify it has a Qdrant collection
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new NotFoundException(`Persona ${personaId} not found`);
    }

    if (!persona.qdrantCollection) {
      throw new Error('Persona does not have a vector collection configured');
    }

    // Determine file type
    const fileType = this.getFileType(filename);

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        filename,
        fileType,
        fileSize,
        url: filePath,
        status: DocumentStatus.PENDING,
        metadata: {},
        personaId,
      },
    });

    // Process document asynchronously
    this.processDocumentAsync(document.id, filePath, filename, persona.qdrantCollection)
      .catch((error) => {
        this.logger.error(`Failed to process document ${document.id}:`, error);
      });

    return document;
  }

  /**
   * Process document and store vectors (async background task)
   */
  private async processDocumentAsync(
    documentId: string,
    filePath: string,
    filename: string,
    qdrantCollection: string,
  ): Promise<void> {
    try {
      // Update status to processing
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      // Process the document
      const processed = await this.documentProcessor.processDocument(filePath, filename);

      // Generate embeddings for all chunks
      const chunks = processed.chunks;
      const chunkTexts = chunks.map((chunk) => chunk.text);

      this.logger.log(`Generating embeddings for ${chunks.length} chunks...`);
      const embeddings = await this.embeddingService.generateEmbeddings(chunkTexts);

      // Prepare vector points for Qdrant
      const vectorPoints = chunks.map((chunk, index) => ({
        id: `${documentId}_chunk_${index}`,
        vector: embeddings[index].embedding,
        payload: {
          documentId,
          text: chunk.text,
          chunkIndex: chunk.metadata.chunkIndex,
          totalChunks: chunk.metadata.totalChunks,
          filename,
          source: 'document',
          createdAt: new Date().toISOString(),
        },
      }));

      // Store vectors in Qdrant
      this.logger.log(`Storing ${vectorPoints.length} vectors in Qdrant...`);
      const vectorIds = await this.vectorService.upsertVectors(qdrantCollection, vectorPoints);

      // Update document status
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.COMPLETED,
          chunkCount: chunks.length,
          vectorIds,
          metadata: {
            ...processed.metadata,
            processedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Successfully processed document ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}:`, error);

      // Update status to failed
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Upload and process text directly (without file)
   */
  async uploadText(
    personaId: string,
    text: string,
    source: string = 'direct-input',
  ): Promise<Document> {
    this.logger.log(`Uploading text for persona ${personaId}`);

    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new NotFoundException(`Persona ${personaId} not found`);
    }

    if (!persona.qdrantCollection) {
      throw new Error('Persona does not have a vector collection configured');
    }

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        filename: source,
        fileType: 'text',
        fileSize: text.length,
        url: null,
        status: DocumentStatus.PENDING,
        metadata: {},
        personaId,
      },
    });

    // Process text asynchronously
    this.processTextAsync(document.id, text, source, persona.qdrantCollection)
      .catch((error) => {
        this.logger.error(`Failed to process text ${document.id}:`, error);
      });

    return document;
  }

  /**
   * Process text and store vectors (async background task)
   */
  private async processTextAsync(
    documentId: string,
    text: string,
    source: string,
    qdrantCollection: string,
  ): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      // Process the text
      const processed = await this.documentProcessor.processText(text, source);

      // Generate embeddings
      const chunks = processed.chunks;
      const chunkTexts = chunks.map((chunk) => chunk.text);

      const embeddings = await this.embeddingService.generateEmbeddings(chunkTexts);

      // Prepare vector points
      const vectorPoints = chunks.map((chunk, index) => ({
        id: `${documentId}_chunk_${index}`,
        vector: embeddings[index].embedding,
        payload: {
          documentId,
          text: chunk.text,
          chunkIndex: chunk.metadata.chunkIndex,
          totalChunks: chunk.metadata.totalChunks,
          source,
          createdAt: new Date().toISOString(),
        },
      }));

      // Store vectors
      const vectorIds = await this.vectorService.upsertVectors(qdrantCollection, vectorPoints);

      // Update document
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.COMPLETED,
          chunkCount: chunks.length,
          vectorIds,
          metadata: processed.metadata,
        },
      });

      this.logger.log(`Successfully processed text ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to process text ${documentId}:`, error);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Get all documents for a persona
   */
  async findAll(personaId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a document and its vectors
   */
  async remove(documentId: string, personaId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, personaId },
      include: { persona: true },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Delete vectors from Qdrant
    if (document.persona.qdrantCollection && document.vectorIds.length > 0) {
      try {
        await this.vectorService.deleteVectors(
          document.persona.qdrantCollection,
          document.vectorIds,
        );
      } catch (error) {
        this.logger.error(`Failed to delete vectors for document ${documentId}:`, error);
      }
    }

    // Delete document record
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    this.logger.log(`Deleted document ${documentId}`);
  }

  /**
   * Get file type from filename
   */
  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
    return ext;
  }
}
