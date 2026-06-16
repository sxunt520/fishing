import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { IsArray, IsOptional, IsString } from 'class-validator';

class GenerateCaptionDto {
  @IsOptional()
  imageUrl?: string | { url?: string; urls?: string[] } | string[];

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  urls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-caption')
  @UseGuards(JwtGuard)
  generateCaption(@Body() dto: GenerateCaptionDto) {
    console.log('[AI Caption Body]', Object.keys(dto || {}), typeof dto?.imageUrl === 'string' ? dto.imageUrl.slice(0, 120) : dto?.imageUrl);
    return this.aiService.generateCaption(dto.imageUrl ?? dto.url ?? dto.urls ?? dto.images ?? dto);
  }
}
