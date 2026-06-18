import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateCaptionDto {
  @ApiPropertyOptional({
    description: '用于生成文案的第一张 COS 图片地址，推荐使用该字段',
    example: 'https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg',
    oneOf: [
      { type: 'string', format: 'uri' },
      { type: 'array', items: { type: 'string', format: 'uri' } },
      {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          urls: { type: 'array', items: { type: 'string', format: 'uri' } },
        },
      },
    ],
  })
  @IsOptional()
  imageUrl?: string | { url?: string; urls?: string[] } | string[];

  @ApiPropertyOptional({
    description: '兼容旧客户端的单张图片 URL',
    example: 'https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg',
    format: 'uri',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: '兼容旧客户端的图片 URL 数组，服务端使用第一张',
    example: ['https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  urls?: string[];

  @ApiPropertyOptional({
    description: '兼容旧客户端的图片数组，服务端使用第一张',
    example: ['https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
