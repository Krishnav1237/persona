import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  provider?: 'openai' | 'anthropic';
}

export interface CompletionResult {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI
    const openaiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn('OPENAI_API_KEY not found - OpenAI features will be unavailable');
    }

    // Initialize Anthropic
    const anthropicKey = this.configService.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.anthropic = new Anthropic({
        apiKey: anthropicKey,
      });
      this.logger.log('Anthropic client initialized');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not found - Anthropic features will be unavailable');
    }
  }

  /**
   * Generate a completion using the specified provider
   */
  async generateCompletion(
    messages: Message[],
    options: CompletionOptions = {},
  ): Promise<CompletionResult> {
    const provider = options.provider || 'openai';

    if (provider === 'openai') {
      return this.generateOpenAICompletion(messages, options);
    } else {
      return this.generateAnthropicCompletion(messages, options);
    }
  }

  /**
   * Generate completion using OpenAI
   */
  private async generateOpenAICompletion(
    messages: Message[],
    options: CompletionOptions,
  ): Promise<CompletionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please set OPENAI_API_KEY.');
    }

    try {
      const model = options.model || 'gpt-4-turbo-preview';
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens || 2000;

      // Prepare messages
      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system prompt if provided
      if (options.systemPrompt) {
        apiMessages.unshift({
          role: 'system',
          content: options.systemPrompt,
        });
      }

      const completion = await this.openai.chat.completions.create({
        model,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const choice = completion.choices[0];

      return {
        content: choice.message.content || '',
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens || 0,
        finishReason: choice.finish_reason || 'unknown',
      };
    } catch (error) {
      this.logger.error('OpenAI completion failed:', error);
      throw error;
    }
  }

  /**
   * Generate completion using Anthropic (Claude)
   */
  private async generateAnthropicCompletion(
    messages: Message[],
    options: CompletionOptions,
  ): Promise<CompletionResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please set ANTHROPIC_API_KEY.');
    }

    try {
      const model = options.model || 'claude-3-5-sonnet-20241022';
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens || 2000;

      // Anthropic expects messages without system role in messages array
      // System prompt goes in a separate parameter
      const apiMessages = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // Extract system prompt (use first system message or provided systemPrompt)
      const systemMessage = messages.find((msg) => msg.role === 'system');
      const systemPrompt = options.systemPrompt || systemMessage?.content || '';

      const completion = await this.anthropic.messages.create({
        model,
        system: systemPrompt,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const content = completion.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      return {
        content: textContent,
        model: completion.model,
        tokensUsed: completion.usage.input_tokens + completion.usage.output_tokens,
        finishReason: completion.stop_reason || 'unknown',
      };
    } catch (error) {
      this.logger.error('Anthropic completion failed:', error);
      throw error;
    }
  }

  /**
   * Smart model selection based on task complexity and cost
   */
  async generateSmartCompletion(
    messages: Message[],
    complexity: 'simple' | 'medium' | 'complex' = 'medium',
    options: Omit<CompletionOptions, 'model'> = {},
  ): Promise<CompletionResult> {
    // Select model based on complexity
    let model: string;
    let provider: 'openai' | 'anthropic' = 'openai';

    switch (complexity) {
      case 'simple':
        model = 'gpt-3.5-turbo'; // Cheap and fast
        break;
      case 'medium':
        model = 'gpt-4-turbo-preview'; // Balanced
        break;
      case 'complex':
        model = 'claude-3-5-sonnet-20241022'; // Best quality
        provider = 'anthropic';
        break;
      default:
        model = 'gpt-4-turbo-preview';
    }

    return this.generateCompletion(messages, { ...options, model, provider });
  }

  /**
   * Stream completion (for real-time responses)
   */
  async *streamCompletion(
    messages: Message[],
    options: CompletionOptions = {},
  ): AsyncGenerator<string> {
    const provider = options.provider || 'openai';

    if (provider === 'anthropic') {
      yield* this.streamAnthropicCompletion(messages, options);
    } else {
      yield* this.streamOpenAICompletion(messages, options);
    }
  }

  /**
   * Stream OpenAI completion
   */
  private async *streamOpenAICompletion(
    messages: Message[],
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || 'gpt-4-turbo-preview';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 2000;

    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    if (options.systemPrompt) {
      apiMessages.unshift({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    const stream = await this.openai.chat.completions.create({
      model,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Stream Anthropic completion
   */
  private async *streamAnthropicCompletion(
    messages: Message[],
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const model = options.model || 'claude-3-5-sonnet-20241022';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 2000;

    const apiMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    const systemMessage = messages.find((msg) => msg.role === 'system');
    const systemPrompt = options.systemPrompt || systemMessage?.content || '';

    const stream = await this.anthropic.messages.create({
      model,
      system: systemPrompt,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: 'openai' | 'anthropic'): boolean {
    return provider === 'openai' ? !!this.openai : !!this.anthropic;
  }
}
