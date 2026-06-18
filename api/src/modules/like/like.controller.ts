import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('api/v1/posts/:postId/like')
@ApiTags('点赞')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '点赞钓点分享', description: '当前用户为指定分享点赞，并返回最新点赞数量。' })
  @ApiParam({ name: 'postId', description: '分享 UUID', example: '9b928d35-f223-4e95-b731-be82df607b8d' })
  @ApiCreatedResponse({ description: '点赞成功', schema: { example: { liked: true, likeCount: 6 } } })
  @ApiConflictResponse({ description: '当前用户已经点赞', schema: { example: { statusCode: 409, message: '已点赞', error: 'Conflict' } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  like(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.likeService.like(postId, user.userId);
  }

  @Delete()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '取消点赞', description: '删除当前用户对指定分享的点赞，并返回最新点赞数量。' })
  @ApiParam({ name: 'postId', description: '分享 UUID', example: '9b928d35-f223-4e95-b731-be82df607b8d' })
  @ApiOkResponse({ description: '取消点赞成功', schema: { example: { liked: false, likeCount: 5 } } })
  @ApiNotFoundResponse({ description: '当前用户尚未点赞', schema: { example: { statusCode: 404, message: '未点赞', error: 'Not Found' } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  unlike(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.likeService.unlike(postId, user.userId);
  }
}
