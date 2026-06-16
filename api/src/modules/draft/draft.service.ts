import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draft } from '@/entities/draft.entity';
import { Inject } from '@nestjs/common';

@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name);

  constructor(
    @InjectRepository(Draft) private draftRepo: Repository<Draft>,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async getDraft(userId: string) {
    const cache = await this.redis.get(`draft:${userId}`);
    if (cache) {
      try {
        return JSON.parse(cache);
      } catch (error) {
        this.logger.warn(`用户 ${userId} 的 Redis 草稿 JSON 已损坏，已清理`);
        await this.redis.del(`draft:${userId}`);
      }
    }

    const rows = await this.draftRepo.query(
      'SELECT id, user_id, spot_id, title, content, images, fish_categories, spot_evaluation, created_at, updated_at FROM drafts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId],
    );
    const draft = rows?.[0];
    if (!draft) return null;

    const normalized = normalizeDraftRow(draft);
    if (!normalized) {
      this.logger.warn(`用户 ${userId} 的 MySQL 草稿 JSON 已损坏，已清理`);
      await this.clearDraft(userId);
      return null;
    }
    return normalized;
  }

  async saveDraft(userId: string, dto: any) {
    const safeDto = { ...dto, images: normalizeDraftImages(dto.images || []) };
    await this.redis.setex(`draft:${userId}`, 86400, JSON.stringify(safeDto));
    const draftData = {
      spotId: safeDto.spotId || safeDto.spot?.id,
      title: safeDto.title,
      content: safeDto.content,
      images: safeDto.images || [],
      fishCategories: safeDto.fishCategories || [],
      spotEvaluation: safeDto.spotEvaluation,
    };

    await this.draftRepo.delete({ userId });
    const draft = this.draftRepo.create({ userId, ...draftData } as Partial<Draft>);
    return this.draftRepo.save(draft);
  }

  async clearDraft(userId: string) {
    await this.redis.del(`draft:${userId}`);
    await this.draftRepo.delete({ userId });
    return { success: true };
  }
}

function normalizeDraftImages(images: string[]) {
  return (images || []).filter((image) => /^https?:\/\//i.test(image || '') && image.length <= 2000);
}

function normalizeDraftRow(row: any) {
  try {
    return {
      id: row.id,
      userId: row.user_id,
      spotId: row.spot_id,
      title: row.title || '',
      content: row.content || '',
      images: normalizeDraftImages(parseJsonArray(row.images)),
      fishCategories: parseJsonArray(row.fish_categories),
      spotEvaluation: row.spot_evaluation || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

function parseJsonArray(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}
