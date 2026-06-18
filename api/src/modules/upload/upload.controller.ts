import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { memoryStorage } from 'multer';
import { CosService } from './cos.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UploadImagesDto } from './dto/upload.dto';

@Controller('api/v1/upload')
@ApiTags('图片上传')
export class UploadController {
  constructor(private readonly cosService: CosService) {}

  @Post('images')
  @UseGuards(JwtGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImagesDto })
  @ApiOperation({
    summary: '上传图片到腾讯云 COS',
    description: '一次最多上传 3 张图片，每张最大 5 MB，成功后返回可直接保存和访问的 COS URL。',
  })
  @ApiCreatedResponse({
    description: '上传成功',
    schema: {
      example: {
        urls: ['https://axe-video-1257242485.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/fish.jpg'],
        keys: ['jh_chat/fishing/20260618/fish.jpg'],
      },
    },
  })
  @ApiBadRequestResponse({ description: '文件为空、数量超限、大小超限或格式不支持' })
  @ApiForbiddenResponse({ description: '腾讯云 COS 拒绝上传' })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('仅支持 jpg/png/webp'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const uploaded = await Promise.all(files.map((file) => this.cosService.uploadImage(file)));
    console.log('[Upload COS]', uploaded.map((item) => item.url));
    return {
      urls: uploaded.map((item) => item.url),
      keys: uploaded.map((item) => item.key),
    };
  }
}
