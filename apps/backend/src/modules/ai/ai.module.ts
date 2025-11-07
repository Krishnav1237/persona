import { Global, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessorService } from './document-processor.service';

@Global()
@Module({
  providers: [AIService, EmbeddingService, DocumentProcessorService],
  exports: [AIService, EmbeddingService, DocumentProcessorService],
})
export class AIModule {}
