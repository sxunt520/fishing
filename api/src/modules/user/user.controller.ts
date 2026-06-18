import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/user.dto';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Controller('api/v1/users')
@ApiTags('用户')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '获取个人资料', description: '获取当前登录用户的手机号、昵称、头像和注册时间。' })
  @ApiOkResponse({
    description: '个人资料',
    schema: { example: { id: 'd29da5be-d34e-40e1-985a-80e3ea96bcaa', phone: '13800138000', nickname: '成都钓友', avatar: 'https://example.com/avatar.jpg', createdAt: '2026-06-18T08:00:00.000Z' } },
  })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  me(@CurrentUser() user: any) {
    return this.userService.getProfile(user.userId);
  }

  @Put('me')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '修改个人资料', description: '修改当前用户的昵称和头像 URL，只需提交需要修改的字段。' })
  @ApiOkResponse({
    description: '修改后的个人资料',
    schema: { example: { id: 'd29da5be-d34e-40e1-985a-80e3ea96bcaa', phone: '13800138000', nickname: '新的昵称', avatar: 'https://example.com/new-avatar.jpg', createdAt: '2026-06-18T08:00:00.000Z' } },
  })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  update(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(user.userId, dto);
  }
}
