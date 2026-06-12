import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConfigService } from '@nestjs/config';

@Controller('api/v1/upload')
export class UploadController {
  constructor(private readonly configService: ConfigService) {}

  @Post('images')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: diskStorage({
        destination: './uploads/images',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('仅支持 jpg/png/webp'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const baseUrl = this.configService.get('APP_PUBLIC_URL', 'http://localhost:3000');
    const urls = files.map((f) => `${baseUrl}/uploads/images/${f.filename}`);
    return { urls };
  }
}
