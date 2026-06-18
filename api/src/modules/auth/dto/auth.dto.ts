import { IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: '用户手机号',
    example: '13800138000',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @Length(11, 11, { message: '手机号必须是11位' })
  phone: string;

  @ApiProperty({
    description: '登录密码',
    example: '123456',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  @IsString()
  @Length(6, 20, { message: '密码长度6-20位' })
  password: string;

  @ApiPropertyOptional({
    description: '用户昵称，不传时由服务端自动生成',
    example: '成都钓友',
  })
  @IsOptional()
  @IsString()
  nickname?: string;
}

export class LoginDto {
  @ApiProperty({
    description: '已注册的手机号',
    example: '13800138000',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @Length(11, 11)
  phone: string;

  @ApiProperty({
    description: '登录密码',
    example: '123456',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  @IsString()
  @Length(6, 20)
  password: string;
}
