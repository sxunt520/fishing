import { IsString, IsOptional, IsArray, IsUUID, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CandidateSpotDto {
  @ApiPropertyOptional({
    description: '高德地图 POI ID，用于候选水域去重和转为真实钓点',
    example: 'B0FFGFBM48',
  })
  @IsOptional()
  @IsString()
  sourcePoiId?: string;

  @ApiProperty({
    description: '候选水域名称',
    example: '府河',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: '候选水域地址',
    example: '四川省成都市锦江区',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: '候选水域纬度',
    example: 30.648034,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: '候选水域经度',
    example: 104.085385,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: '候选水域来源',
    example: 'amap',
    enum: ['amap', 'user'],
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class CreatePostDto {
  @ApiPropertyOptional({
    description: '真实钓点 UUID。发布真实钓点时填写，与 candidateSpot 至少传一个',
    example: '65333cd9-f988-49b5-a460-a01b646ce48e',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  spotId?: string;

  @ApiPropertyOptional({
    description: '候选水域信息。发布候选水域时填写，发布成功后候选水域转为真实钓点',
    type: () => CandidateSpotDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CandidateSpotDto)
  candidateSpot?: CandidateSpotDto;

  @ApiPropertyOptional({
    description: '分享标题',
    example: '今天府河鱼口不错',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '垂钓心得正文',
    example: '下午三点开始作钓，鲫鱼口比较稳定。',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '已上传到对象存储的图片 URL，最多使用三张；不接受 Base64',
    example: [
      'https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: '本次分享的鱼获类别',
    example: ['鲫鱼', '鲤鱼'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fishCategories?: string[];

  @ApiPropertyOptional({
    description: '钓点评价标签',
    example: '野钓',
  })
  @IsOptional()
  @IsString()
  spotEvaluation?: string;
}
