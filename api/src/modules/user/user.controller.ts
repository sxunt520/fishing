import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: any) {
    return this.userService.getProfile(user.userId);
  }

  @Put('me')
  @UseGuards(JwtGuard)
  update(@CurrentUser() user: any, @Body() dto: { nickname?: string; avatar?: string }) {
    return this.userService.updateProfile(user.userId, dto);
  }
}
