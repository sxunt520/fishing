import { ApiProperty } from '@nestjs/swagger';

export class UploadImagesDto {
  @ApiProperty({
    description: '待上传图片，最多 3 张，每张最大 5 MB，支持 jpg、jpeg、png、webp',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  files: any[];
}
