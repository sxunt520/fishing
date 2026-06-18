import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Controller('api/v1/notifications')
@ApiTags('通知')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '获取我的通知', description: '分页获取点赞、评论和关注通知，每页固定 20 条。' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: '页码，从 1 开始' })
  @ApiOkResponse({
    description: '通知列表',
    schema: { example: [{ type: 'like', data: { postId: 'post-uuid' }, read: false, createdAt: '2026-06-18T08:00:00.000Z' }] },
  })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  get(@CurrentUser() user: any, @Query('page') page: number = 1) {
    return this.notificationService.getNotifications(user.userId, +page);
  }
}
