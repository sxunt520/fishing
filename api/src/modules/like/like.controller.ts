import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/posts/:postId/like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post()
  @UseGuards(JwtGuard)
  like(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.likeService.like(postId, user.userId);
  }

  @Delete()
  @UseGuards(JwtGuard)
  unlike(@Param('postId') postId: string, @CurrentUser() user: any) {
    return this.likeService.unlike(postId, user.userId);
  }
}
