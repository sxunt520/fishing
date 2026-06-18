import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/comment.dto';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('api/v1/posts/:postId/comments')
@ApiTags('评论')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ summary: '获取分享评论列表', description: '分页获取指定分享的评论和回复，按照创建时间正序排列。' })
  @ApiParam({ name: 'postId', description: '分享 UUID', example: '9b928d35-f223-4e95-b731-be82df607b8d' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: '页码，从 1 开始' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: '每页数量' })
  @ApiOkResponse({
    description: '评论分页数据',
    schema: {
      example: {
        data: [{
          id: 'comment-uuid',
          postId: 'post-uuid',
          userId: 'user-uuid',
          parentId: null,
          replyToUserId: null,
          content: '这里下午鱼口怎么样？',
          user: { id: 'user-uuid', nickname: '成都钓友', avatar: null },
          replyToUser: null,
          createdAt: '2026-06-18T08:00:00.000Z',
        }],
        total: 1,
        page: 1,
        limit: 20,
      },
    },
  })
  findAll(@Param('postId') postId: string, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.commentService.findAll(postId, +page, +limit);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '发表评论或回复', description: '创建普通评论；传入 parentId 和 replyToUserId 时创建 @回复。' })
  @ApiParam({ name: 'postId', description: '分享 UUID', example: '9b928d35-f223-4e95-b731-be82df607b8d' })
  @ApiCreatedResponse({
    description: '评论创建成功',
    schema: {
      example: {
        id: 'comment-uuid',
        postId: 'post-uuid',
        userId: 'user-uuid',
        parentId: null,
        replyToUserId: null,
        content: '这里下午鱼口怎么样？',
        user: { id: 'user-uuid', nickname: '成都钓友', avatar: null },
        replyToUser: null,
        createdAt: '2026-06-18T08:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: '评论内容为空' })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  create(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentService.create(
      postId,
      dto.content,
      user.userId,
      dto.parentId,
      dto.replyToUserId,
    );
  }
}
