import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Controller('api/v1/favorites')
@ApiTags('收藏')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':spotId')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '收藏钓点', description: '将指定钓点加入当前用户的收藏，并增加钓点热度。' })
  @ApiParam({ name: 'spotId', description: '钓点 UUID', example: '65333cd9-f988-49b5-a460-a01b646ce48e' })
  @ApiCreatedResponse({ description: '收藏成功', schema: { example: { favorited: true } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  add(@Param('spotId') spotId: string, @CurrentUser() user: any) {
    return this.favoriteService.addFavorite(user.userId, spotId);
  }

  @Delete(':spotId')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '取消收藏钓点', description: '从当前用户的收藏中移除指定钓点。' })
  @ApiParam({ name: 'spotId', description: '钓点 UUID', example: '65333cd9-f988-49b5-a460-a01b646ce48e' })
  @ApiOkResponse({ description: '取消收藏成功', schema: { example: { favorited: false } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  remove(@Param('spotId') spotId: string, @CurrentUser() user: any) {
    return this.favoriteService.removeFavorite(user.userId, spotId);
  }

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '获取我的收藏', description: '返回当前用户收藏的全部钓点 ID。' })
  @ApiOkResponse({ description: '收藏钓点 ID 列表', schema: { example: { spotIds: ['65333cd9-f988-49b5-a460-a01b646ce48e'] } } })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  get(@CurrentUser() user: any) {
    return this.favoriteService.getFavorites(user.userId);
  }
}
