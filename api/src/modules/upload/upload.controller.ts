import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { memoryStorage } from 'multer';
import { CosService } from './cos.service';

@Controller('api/v1/upload')
export class UploadController {
  constructor(private readonly cosService: CosService) {}

  @Post('images')
  @UseGuards(JwtGuard)
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
