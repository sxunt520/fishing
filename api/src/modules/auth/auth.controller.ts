import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('api/v1/auth')
@ApiTags('认证')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册', description: '使用手机号和密码注册账号，成功后直接返回访问令牌和刷新令牌。' })
  @ApiCreatedResponse({
    description: '注册成功',
    schema: { example: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', refreshToken: 'eyJhbGciOiJIUzI1NiIs...', expiresIn: 604800 } },
  })
  @ApiConflictResponse({ description: '手机号已注册', schema: { example: { statusCode: 409, message: '该手机号已注册', error: 'Conflict' } } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录', description: '校验手机号和密码，成功后返回 JWT Token。' })
  @ApiCreatedResponse({
    description: '登录成功',
    schema: { example: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', refreshToken: 'eyJhbGciOiJIUzI1NiIs...', expiresIn: 604800 } },
  })
  @ApiUnauthorizedResponse({ description: '用户不存在或密码错误', schema: { example: { statusCode: 401, message: '密码错误', error: 'Unauthorized' } } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '获取当前登录用户', description: '根据 Bearer Token 获取当前用户的基本资料。' })
  @ApiCreatedResponse({
    description: '当前用户资料',
    schema: { example: { id: 'd29da5be-d34e-40e1-985a-80e3ea96bcaa', phone: '13800138000', nickname: '成都钓友', avatar: 'https://example.com/avatar.jpg', createdAt: '2026-06-18T08:00:00.000Z' } },
  })
  @ApiUnauthorizedResponse({ description: '缺少或无效的认证令牌' })
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.userId);
  }

  @Post('refresh')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '刷新登录令牌', description: '使用当前有效的 Bearer Token 重新签发 accessToken 和 refreshToken。' })
  @ApiOkResponse({
    description: '刷新成功',
    schema: { example: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token', expiresIn: 604800 } },
  })
  @ApiUnauthorizedResponse({ description: '当前 Token 无效或已过期' })
  refresh(@CurrentUser() user: any) {
    return this.authService.refreshToken(user.userId);
  }
}
