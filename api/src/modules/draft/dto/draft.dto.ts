import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveDraftDto {
  @ApiPropertyOptional({
    description: '已入库真实钓点 UUID',
    example: '65333cd9-f988-49b5-a460-a01b646ce48e',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  spotId?: string;

  @ApiPropertyOptional({
    description: '前端选中的钓点完整对象，用于恢复编辑状态；可以是真实钓点或候选水域',
    type: 'object',
    additionalProperties: true,
    example: {
      id: 'amap_B0FFGFBM48',
      sourcePoiId: 'B0FFGFBM48',
      source: 'amap',
      name: '府河',
      address: '锦江区',
      latitude: 30.648034,
      longitude: 104.085385,
      status: 'candidate',
      isCandidate: true,
    },
  })
  @IsOptional()
  @IsObject()
  spot?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '草稿标题',
    example: '今天府河鱼口不错',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '草稿正文',
    example: '下午三点开始作钓，鲫鱼口比较稳定。',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '已上传到对象存储的图片 URL；本地 URI 和 Base64 不会保存',
    example: ['https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: '鱼获类别标签',
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
