import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtGuard } from '@/common/guards/jwt.guard';

class GenerateCaptionDto {
  imageUrl: string;
}

@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-caption')
  @UseGuards(JwtGuard)
  generateCaption(@Body() dto: GenerateCaptionDto) {
    return this.aiService.generateCaption(dto.imageUrl);
  }
}
