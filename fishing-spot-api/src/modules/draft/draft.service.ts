import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draft } from '@/entities/draft.entity';
import { Inject } from '@nestjs/common';

@Injectable()
export class DraftService {
  constructor(
    @InjectRepository(Draft) private draftRepo: Repository<Draft>,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async getDraft(userId: string) {
    const cache = await this.redis.get(`draft:${userId}`);
    if (cache) return JSON.parse(cache);

    const draft = await this.draftRepo.findOne({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return draft || null;
  }

  async saveDraft(userId: string, dto: any) {
    await this.redis.setex(`draft:${userId}`, 86400, JSON.stringify(dto));
    const draftData = {
      spotId: dto.spotId || dto.spot?.id,
      title: dto.title,
      content: dto.content,
      images: dto.images || [],
      fishCategories: dto.fishCategories || [],
      spotEvaluation: dto.spotEvaluation,
    };

    let draft = await this.draftRepo.findOne({ where: { userId } });
    if (draft) {
      Object.assign(draft, draftData);
    } else {
      draft = this.draftRepo.create({ userId, ...draftData } as Partial<Draft>);
    }
    return this.draftRepo.save(draft);
  }

  async clearDraft(userId: string) {
    await this.redis.del(`draft:${userId}`);
    await this.draftRepo.delete({ userId });
    return { success: true };
  }
}
