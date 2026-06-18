import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpotDto {
  @ApiProperty({
    description: '钓点名称',
    example: '明湖',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: '钓点地址',
    example: '北京市海淀区西长安街',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: '钓点纬度',
    example: 39.9042,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: '钓点经度',
    example: 116.4074,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: '该钓点推荐或常见鱼种',
    example: ['鲫鱼', '草鱼'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fishTypes?: string[];
}

export class UserCandidateDto {
  @ApiProperty({
    description: '用户长按位置的纬度',
    example: 30.5006,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: '用户长按位置的经度',
    example: 104.0725,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: '用户为候选钓点填写的名称，不传时使用高德识别结果',
    example: '府河桥下钓位',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '用户提交候选钓点时的补充说明，当前版本接收但尚未持久化',
    example: '桥下靠近步道的位置',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
