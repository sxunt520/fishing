import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/posts/:postId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  findAll(@Param('postId') postId: string, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.commentService.findAll(postId, +page, +limit);
  }

  @Post()
  @UseGuards(JwtGuard)
  create(@Param('postId') postId: string, @Body('content') content: string, @CurrentUser() user: any) {
    return this.commentService.create(postId, content, user.userId);
  }
}
