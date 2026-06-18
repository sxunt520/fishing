import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: '评论或回复内容，去除首尾空格后不能为空',
    example: '这里下午鱼口怎么样？',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: '回复评论时填写父评论 UUID',
    example: '1f6f4c8e-43cb-4c6d-b3d6-8248eae78eb1',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: '被回复用户 UUID，用于显示 @用户名',
    example: 'd29da5be-d34e-40e1-985a-80e3ea96bcaa',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  replyToUserId?: string;
}
