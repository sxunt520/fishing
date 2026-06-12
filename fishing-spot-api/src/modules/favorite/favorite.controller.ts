import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':spotId')
  @UseGuards(JwtGuard)
  add(@Param('spotId') spotId: string, @CurrentUser() user: any) {
    return this.favoriteService.addFavorite(user.userId, spotId);
  }

  @Delete(':spotId')
  @UseGuards(JwtGuard)
  remove(@Param('spotId') spotId: string, @CurrentUser() user: any) {
    return this.favoriteService.removeFavorite(user.userId, spotId);
  }

  @Get()
  @UseGuards(JwtGuard)
  get(@CurrentUser() user: any) {
    return this.favoriteService.getFavorites(user.userId);
  }
}
