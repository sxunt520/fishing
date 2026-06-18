import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '新的用户昵称',
    example: '成都钓友',
  })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({
    description: '新的头像 URL',
    example: 'https://bucket.cos.ap-guangzhou.myqcloud.com/avatar/user.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
