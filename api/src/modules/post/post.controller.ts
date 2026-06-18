import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/post.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('api/v1')
@ApiTags('钓点分享')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // @Get('spots/:spotId/posts')
  // findBySpot(@Param('spotId') spotId: string, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
  //   return this.postService.findBySpot(spotId, +page, +limit);
  // }

  @Get('spots/:spotId/posts')
  @ApiOperation({ summary: '获取钓点的分享列表', description: '分页获取指定真实钓点的钓友分享；也支持传入 amap_POI_ID 并自动解析为已入库钓点。' })
  @ApiParam({ name: 'spotId', description: '真实钓点 UUID 或 amap_POI_ID', example: '65333cd9-f988-49b5-a460-a01b646ce48e' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: '页码，从 1 开始' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: '每页数量' })
  @ApiOkResponse({
    description: '分享分页列表',
    schema: {
      example: {
        data: [{
          id: '9b928d35-f223-4e95-b731-be82df607b8d',
          userId: 'user-uuid',
          spotId: 'spot-uuid',
          title: '今天府河鱼口不错',
          content: '下午三点开始作钓，鲫鱼口比较稳定。',
          images: ['https://example.com/fish.jpg'],
          fishCategories: ['鲫鱼'],
          spotEvaluation: '野钓',
          likeCount: 5,
          commentCount: 2,
          user: { id: 'user-uuid', nickname: '成都钓友', avatar: null },
          createdAt: '2026-06-18T08:00:00.000Z',
        }],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
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
  @ApiOperation({ summary: '获取单条分享详情', description: '获取分享正文、图片、发布用户、所属钓点及评论关系。' })
  @ApiParam({ name: 'id', description: '分享 UUID', example: '9b928d35-f223-4e95-b731-be82df607b8d' })
  @ApiOkResponse({
    description: '分享详情',
    schema: {
      example: {
        id: '9b928d35-f223-4e95-b731-be82df607b8d',
        title: '今天府河鱼口不错',
        content: '下午三点开始作钓，鲫鱼口比较稳定。',
        images: ['https://example.com/fish.jpg'],
        fishCategories: ['鲫鱼'],
        spotEvaluation: '野钓',
        likeCount: 5,
        commentCount: 2,
        user: { id: 'user-uuid', nickname: '成都钓友' },
        spot: { id: 'spot-uuid', name: '府河', address: '锦江区' },
        comments: [],
      },
    },
  })
  @ApiNotFoundResponse({ description: '分享不存在' })
  findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Post('posts')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: '发布钓点分享',
    description: '发布真实钓点或候选水域的分享。候选水域发布成功后会自动入库或升级为 verified 真实钓点。',
  })
  @ApiCreatedResponse({
    description: '发布成功',
    schema: {
      example: {
        id: '9b928d35-f223-4e95-b731-be82df607b8d',
        userId: 'user-uuid',
        spotId: 'spot-uuid',
        title: '今天府河鱼口不错',
        content: '下午三点开始作钓，鲫鱼口比较稳定。',
        images: ['https://example.com/fish.jpg'],
        fishCategories: ['鲫鱼'],
        spotEvaluation: '野钓',
        likeCount: 0,
        commentCount: 0,
        createdAt: '2026-06-18T08:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: '图片不是远程 URL 或候选钓点信息不完整' })
  @ApiForbiddenResponse({ description: '未选择钓点标记' })
  @ApiNotFoundResponse({ description: '真实钓点不存在' })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: any) {
    return this.postService.create(dto, user.userId);
  }

  @Delete('posts/:id')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '删除自己的分享', description: '仅分享作者可以删除；同时减少钓点分享数量和热度。' })
  @ApiParam({ name: 'id', description: '分享 UUID', example: '9b928d35-f223-4e95-b731-be82df607b8d' })
  @ApiOkResponse({ description: '删除成功', schema: { example: { success: true } } })
  @ApiNotFoundResponse({ description: '分享不存在' })
  @ApiForbiddenResponse({ description: '当前用户不是分享作者' })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postService.remove(id, user.userId);
  }
}
