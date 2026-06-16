import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/post.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // @Get('spots/:spotId/posts')
  // findBySpot(@Param('spotId') spotId: string, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
  //   return this.postService.findBySpot(spotId, +page, +limit);
  // }

  @Get('spots/:spotId/posts')
  findBySpot(
    @Param('spotId') spotId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    
    // 清洗：非数字或小于1则用默认值
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
    
    return this.postService.findBySpot(spotId, pageNum, limitNum);
  }

  @Get('posts/:id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Post('posts')
  @UseGuards(JwtGuard)
  create(@Body() dto: CreatePostDto, @CurrentUser() user: any) {
    return this.postService.create(dto, user.userId);
  }

  @Delete('posts/:id')
  @UseGuards(JwtGuard)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postService.remove(id, user.userId);
  }
}
