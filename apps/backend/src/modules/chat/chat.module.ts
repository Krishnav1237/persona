import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConversationService } from './conversation.service';
import { RAGService } from './rag.service';
import { PersonaModule } from '../persona/persona.module';

@Module({
  imports: [PersonaModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationService, RAGService],
  exports: [ChatService, ConversationService],
})
export class ChatModule {}
