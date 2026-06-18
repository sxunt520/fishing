import { Controller, Get, Post, Body, Delete, UseGuards } from '@nestjs/common';
import { DraftService } from './draft.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SaveDraftDto } from './dto/draft.dto';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Controller('api/v1/drafts')
@ApiTags('草稿')
export class DraftController {
  constructor(private readonly draftService: DraftService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '获取我的发布草稿', description: '优先读取 Redis 草稿缓存，缓存不存在时读取 MySQL；没有草稿时返回 null。' })
  @ApiOkResponse({
    description: '草稿内容或 null',
    schema: {
      example: {
        id: 'draft-uuid',
        spotId: 'spot-uuid',
        title: '今天府河鱼口不错',
        content: '下午继续测试这个钓位。',
        images: ['https://example.com/fish.jpg'],
        fishCategories: ['鲫鱼'],
        spotEvaluation: '野钓',
        updatedAt: '2026-06-18T08:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  getDraft(@CurrentUser() user: any) {
    return this.draftService.getDraft(user.userId);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '保存发布草稿', description: '保存当前编辑内容到 Redis 和 MySQL；只持久化 http/https 图片地址。' })
  @ApiCreatedResponse({
    description: '草稿保存成功',
    schema: { example: { id: 'draft-uuid', userId: 'user-uuid', spotId: 'spot-uuid', title: '草稿标题', content: '草稿正文', images: ['https://example.com/fish.jpg'], fishCategories: ['鲫鱼'], spotEvaluation: '野钓' } },
  })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  saveDraft(@Body() dto: SaveDraftDto, @CurrentUser() user: any) {
    return this.draftService.saveDraft(user.userId, dto);
  }

  @Delete()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '清空发布草稿', description: '同时删除当前用户在 Redis 和 MySQL 中的发布草稿。' })
  @ApiOkResponse({ description: '清空成功', schema: { example: { success: true } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  clearDraft(@CurrentUser() user: any) {
    return this.draftService.clearDraft(user.userId);
  }
}
