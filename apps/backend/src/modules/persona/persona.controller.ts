import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PersonaService } from './persona.service';
import { DocumentService } from './document.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Note: JwtAuthGuard will be implemented in the auth module
// For now, using a placeholder
const JwtAuthGuard = () => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    // Placeholder - will be replaced with actual guard
    return descriptor;
  };
};

@ApiTags('personas')
@Controller('personas')
export class PersonaController {
  constructor(
    private readonly personaService: PersonaService,
    private readonly documentService: DocumentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new persona' })
  @ApiResponse({ status: 201, description: 'Persona created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  async create(@Request() req: any, @Body() createPersonaDto: CreatePersonaDto) {
    // TODO: Extract user ID from JWT token once auth is implemented
    const userId = req.user?.userId || 'demo-user-id';
    return this.personaService.create(userId, createPersonaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all personas for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of personas' })
  @ApiBearerAuth()
  async findAll(@Request() req: any) {
    const userId = req.user?.userId || 'demo-user-id';
    return this.personaService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific persona by ID' })
  @ApiResponse({ status: 200, description: 'Persona details' })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || 'demo-user-id';
    return this.personaService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a persona' })
  @ApiResponse({ status: 200, description: 'Persona updated successfully' })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePersonaDto: UpdatePersonaDto,
  ) {
    const userId = req.user?.userId || 'demo-user-id';
    return this.personaService.update(id, userId, updatePersonaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a persona' })
  @ApiResponse({ status: 200, description: 'Persona deleted successfully' })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || 'demo-user-id';
    await this.personaService.remove(id, userId);
    return { message: 'Persona deleted successfully' };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get persona statistics' })
  @ApiResponse({ status: 200, description: 'Persona statistics' })
  @ApiBearerAuth()
  async getStats(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || 'demo-user-id';
    return this.personaService.getStats(id, userId);
  }

  // Document Management Endpoints

  @Post(':id/documents/upload')
  @ApiOperation({ summary: 'Upload a document to train the persona' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
        const ext = extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF, DOCX, TXT, and MD files are allowed'), false);
        }
      },
    }),
  )
  async uploadDocument(
    @Param('id') personaId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.documentService.uploadDocument(
      personaId,
      file.path,
      file.originalname,
      file.size,
    );
  }

  @Post(':id/documents/text')
  @ApiOperation({ summary: 'Upload text directly to train the persona' })
  @ApiResponse({ status: 201, description: 'Text uploaded successfully' })
  @ApiBearerAuth()
  async uploadText(
    @Param('id') personaId: string,
    @Body() body: { text: string; source?: string },
  ) {
    if (!body.text) {
      throw new BadRequestException('Text is required');
    }

    return this.documentService.uploadText(personaId, body.text, body.source);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for a persona' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  @ApiBearerAuth()
  async getDocuments(@Param('id') personaId: string) {
    return this.documentService.findAll(personaId);
  }

  @Delete(':id/documents/:documentId')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiBearerAuth()
  async deleteDocument(
    @Param('id') personaId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.documentService.remove(documentId, personaId);
    return { message: 'Document deleted successfully' };
  }
}
