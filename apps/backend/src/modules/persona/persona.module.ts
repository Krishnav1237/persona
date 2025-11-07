import { Module } from '@nestjs/common';
import { PersonaService } from './persona.service';
import { PersonaController } from './persona.controller';
import { DocumentService } from './document.service';

@Module({
  controllers: [PersonaController],
  providers: [PersonaService, DocumentService],
  exports: [PersonaService],
})
export class PersonaModule {}
