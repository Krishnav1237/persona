import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';

class ChatRequestDto {
  personaId: string;
  message: string;
  deploymentId?: string;
  externalUserId?: string;
  externalUserData?: any;
  conversationId?: string;
}

class FeedbackDto {
  rating: number;
  feedback?: string;
}

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send a message and get AI response' })
  @ApiResponse({ status: 200, description: 'AI response generated successfully' })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  async chat(@Body() request: ChatRequestDto) {
    return this.chatService.chat(request);
  }

  @Get('conversations/:personaId')
  @ApiOperation({ summary: 'Get all conversations for a persona' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  @ApiBearerAuth()
  async getConversations(
    @Param('personaId') personaId: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getConversations(personaId, limit ? parseInt(limit) : 50);
  }

  @Get('conversation/:id')
  @ApiOperation({ summary: 'Get a specific conversation with messages' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(@Param('id') id: string) {
    return this.chatService.getConversation(id);
  }

  @Post('conversation/:id/end')
  @ApiOperation({ summary: 'End a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation ended' })
  async endConversation(@Param('id') id: string) {
    await this.conversationService.endConversation(id);
    return { message: 'Conversation ended successfully' };
  }

  @Post('message/:id/feedback')
  @ApiOperation({ summary: 'Provide feedback on a message' })
  @ApiResponse({ status: 200, description: 'Feedback saved' })
  async addFeedback(@Param('id') messageId: string, @Body() feedback: FeedbackDto) {
    return this.conversationService.addFeedback(messageId, feedback.rating, feedback.feedback);
  }

  @Get('stats/:personaId')
  @ApiOperation({ summary: 'Get conversation statistics for a persona' })
  @ApiResponse({ status: 200, description: 'Conversation statistics' })
  @ApiBearerAuth()
  async getStats(@Param('personaId') personaId: string) {
    return this.conversationService.getConversationStats(personaId);
  }
}
