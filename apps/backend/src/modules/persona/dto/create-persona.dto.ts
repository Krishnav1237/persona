import { IsString, IsOptional, IsObject, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToneConfigDto {
  @ApiProperty({ minimum: 1, maximum: 10, description: 'Formality level (1=casual, 10=professional)' })
  @IsInt()
  @Min(1)
  @Max(10)
  formality: number;

  @ApiProperty({ minimum: 1, maximum: 10, description: 'Humor level (1=serious, 10=playful)' })
  @IsInt()
  @Min(1)
  @Max(10)
  humor: number;

  @ApiProperty({ minimum: 1, maximum: 10, description: 'Technical depth (1=simple, 10=expert)' })
  @IsInt()
  @Min(1)
  @Max(10)
  technical: number;

  @ApiProperty({ minimum: 1, maximum: 10, description: 'Empathy level (1=direct, 10=nurturing)' })
  @IsInt()
  @Min(1)
  @Max(10)
  empathy: number;

  @ApiProperty({ minimum: 1, maximum: 10, description: 'Energy level (1=calm, 10=energetic)' })
  @IsInt()
  @Min(1)
  @Max(10)
  energy: number;
}

export class GuardrailsDto {
  @ApiPropertyOptional({ type: [String], description: 'Topics to avoid' })
  @IsOptional()
  @IsString({ each: true })
  topicsToAvoid?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Core brand values' })
  @IsOptional()
  @IsString({ each: true })
  brandValues?: string[];

  @ApiPropertyOptional({ description: 'Response limits (max length, complexity, etc.)' })
  @IsOptional()
  @IsObject()
  responseLimits?: Record<string, any>;
}

export class CreatePersonaDto {
  @ApiProperty({ description: 'Persona name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Persona description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Custom system prompt' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ type: ToneConfigDto, description: 'Tone configuration' })
  @IsOptional()
  @IsObject()
  toneConfig?: ToneConfigDto;

  @ApiPropertyOptional({ type: GuardrailsDto, description: 'Guardrails and boundaries' })
  @IsOptional()
  @IsObject()
  guardrails?: GuardrailsDto;

  @ApiPropertyOptional({ description: 'Enable memory', default: true })
  @IsOptional()
  @IsBoolean()
  memoryEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Memory retention in days', default: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  memoryRetention?: number;

  @ApiPropertyOptional({ description: 'Team ID if creating for a team' })
  @IsOptional()
  @IsString()
  teamId?: string;
}
