import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface DocumentChunk {
  text: string;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
    source?: string;
  };
}

export interface ProcessedDocument {
  text: string;
  chunks: DocumentChunk[];
  metadata: {
    filename: string;
    fileType: string;
    wordCount: number;
    charCount: number;
    chunkCount: number;
  };
}

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  // Chunking parameters
  private readonly DEFAULT_CHUNK_SIZE = 500; // tokens (approx 2000 chars)
  private readonly CHUNK_OVERLAP = 50; // tokens overlap for context

  /**
   * Process a document file and return text with chunks
   */
  async processDocument(
    filePath: string,
    filename: string,
  ): Promise<ProcessedDocument> {
    this.logger.log(`Processing document: ${filename}`);

    const fileType = this.getFileType(filename);
    let text: string;

    try {
      switch (fileType) {
        case 'pdf':
          text = await this.extractTextFromPDF(filePath);
          break;
        case 'docx':
          text = await this.extractTextFromDOCX(filePath);
          break;
        case 'txt':
        case 'md':
          text = await this.extractTextFromPlainText(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Clean the text
      text = this.cleanText(text);

      // Create chunks
      const chunks = this.createChunks(text, filename);

      const metadata = {
        filename,
        fileType,
        wordCount: this.countWords(text),
        charCount: text.length,
        chunkCount: chunks.length,
      };

      this.logger.log(
        `Successfully processed ${filename}: ${metadata.wordCount} words, ${metadata.chunkCount} chunks`,
      );

      return {
        text,
        chunks,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to process document ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  /**
   * Extract text from DOCX
   */
  private async extractTextFromDOCX(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Extract text from plain text file
   */
  private async extractTextFromPlainText(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    return text
      // Remove multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove excessive whitespace
      .replace(/[ \t]{2,}/g, ' ')
      // Trim each line
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      // Remove empty lines at start/end
      .trim();
  }

  /**
   * Create semantic chunks from text
   */
  private createChunks(text: string, source?: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    // Split into paragraphs first
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';
    let chunkStartChar = 0;

    for (const paragraph of paragraphs) {
      const paragraphWords = this.countWords(paragraph);

      // If adding this paragraph would exceed chunk size
      if (
        this.countWords(currentChunk) + paragraphWords > this.DEFAULT_CHUNK_SIZE &&
        currentChunk.length > 0
      ) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            chunkIndex: chunks.length,
            totalChunks: 0, // Will update later
            startChar: chunkStartChar,
            endChar: chunkStartChar + currentChunk.length,
            source,
          },
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk);
        chunkStartChar = chunkStartChar + currentChunk.length - overlapText.length;
        currentChunk = overlapText + '\n\n' + paragraph;
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          chunkIndex: chunks.length,
          totalChunks: 0,
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length,
          source,
        },
      });
    }

    // Update totalChunks in all chunks
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string): string {
    const words = text.split(/\s+/);
    const overlapWords = words.slice(-this.CHUNK_OVERLAP);
    return overlapWords.join(' ');
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * Determine file type from filename
   */
  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return ext || 'txt';
  }

  /**
   * Process text directly (without file)
   */
  async processText(text: string, source?: string): Promise<ProcessedDocument> {
    const cleanedText = this.cleanText(text);
    const chunks = this.createChunks(cleanedText, source);

    return {
      text: cleanedText,
      chunks,
      metadata: {
        filename: source || 'direct-input',
        fileType: 'text',
        wordCount: this.countWords(cleanedText),
        charCount: cleanedText.length,
        chunkCount: chunks.length,
      },
    };
  }

  /**
   * Process multiple documents in batch
   */
  async processDocuments(
    files: Array<{ path: string; name: string }>,
  ): Promise<ProcessedDocument[]> {
    const results = await Promise.allSettled(
      files.map((file) => this.processDocument(file.path, file.name)),
    );

    const processedDocs: ProcessedDocument[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        processedDocs.push(result.value);
      } else {
        this.logger.error(`Failed to process ${files[index].name}:`, result.reason);
      }
    });

    return processedDocs;
  }
}
