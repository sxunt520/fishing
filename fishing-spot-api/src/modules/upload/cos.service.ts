import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import type COS from 'cos-nodejs-sdk-v5';

const COSClient = require('cos-nodejs-sdk-v5') as typeof COS;

@Injectable()
export class CosService {
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    const secretId = this.normalizeSecret(this.configService.get<string>('TENCENT_COS_SECRET_ID'));
    const secretKey = this.normalizeSecret(this.configService.get<string>('TENCENT_COS_SECRET_KEY'));
    this.bucket = this.normalizeSecret(this.configService.get<string>('TENCENT_COS_BUCKET', ''));
    this.region = this.normalizeSecret(this.configService.get<string>('TENCENT_COS_REGION', ''));
    this.prefix = this.normalizePrefix(this.configService.get<string>('TENCENT_COS_PREFIX', 'jh_chat/fishing'));

    if (!secretId || !secretKey || !this.bucket || !this.region) {
      throw new Error('腾讯云 COS 配置不完整，请检查 TENCENT_COS_SECRET_ID / TENCENT_COS_SECRET_KEY / TENCENT_COS_BUCKET / TENCENT_COS_REGION');
    }

    this.cos = new COSClient({
      SecretId: secretId,
      SecretKey: secretKey,
    });
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('上传文件为空');
    const key = this.buildObjectKey(file.originalname);

    try {
      await this.cos.putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Body: file.buffer,
        ContentLength: file.size,
        ContentType: file.mimetype,
      });
      return {
        key,
        url: `https://${this.bucket}.cos.${this.region}.myqcloud.com/${encodeURI(key)}`,
      };
    } catch (error: any) {
      console.error('[COS Upload Error]', error);
      if (error?.code === 'AccessDenied' || error?.statusCode === 403) {
        throw new ForbiddenException('腾讯云 COS 拒绝上传：请检查 SecretId/SecretKey 是否属于该 bucket 所在账号，并确认已授予 cos:PutObject 权限');
      }
      throw new InternalServerErrorException(error?.message || '图片上传 COS 失败');
    }
  }

  private buildObjectKey(originalName: string) {
    const now = new Date();
    const dateDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const ext = this.safeExt(originalName);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    return `${this.prefix}/${dateDir}/${uniqueName}`;
  }

  private safeExt(filename: string) {
    const ext = extname(filename || '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  }

  private normalizePrefix(prefix: string) {
    return prefix.replace(/^\/+|\/+$/g, '') || 'jh_chat/fishing';
  }

  private normalizeSecret(value?: string) {
    return (value || '').trim().replace(/^['"]|['"]$/g, '');
  }
}
