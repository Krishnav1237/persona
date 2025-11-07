import { PartialType } from '@nestjs/swagger';
import { CreatePersonaDto } from './create-persona.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePersonaDto extends PartialType(CreatePersonaDto) {
  @ApiPropertyOptional({ description: 'Set persona active/inactive' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Make persona public (for marketplace)' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
