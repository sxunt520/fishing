import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { GenerateCaptionDto } from './dto/ai.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('api/v1/ai')
@ApiTags('AI 文案')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-caption')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: '根据图片生成钓鱼文案',
    description: '使用第一张腾讯云 COS 图片调用阿里通义千问视觉模型，生成分享标题和垂钓心得。',
  })
  @ApiCreatedResponse({
    description: 'AI 生成成功；上游模型异常时服务端会返回默认文案',
    schema: { example: { title: '府河野钓收获满满', content: '午后水面微风轻拂，鲫鱼接连咬钩，今天的垂钓体验十分惬意。' } },
  })
  @ApiBadRequestResponse({ description: '未提供图片地址', schema: { example: { statusCode: 400, message: 'imageUrl 是必需的', error: 'Bad Request' } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  generateCaption(@Body() dto: GenerateCaptionDto) {
    console.log('[AI Caption Body]', Object.keys(dto || {}), typeof dto?.imageUrl === 'string' ? dto.imageUrl.slice(0, 120) : dto?.imageUrl);
    return this.aiService.generateCaption(dto.imageUrl ?? dto.url ?? dto.urls ?? dto.images ?? dto);
  }
}
