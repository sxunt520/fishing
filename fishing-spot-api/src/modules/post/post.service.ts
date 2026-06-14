import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '@/entities/post.entity';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { CreatePostDto } from './dto/post.dto';
import { Inject } from '@nestjs/common';
import { SpotService } from '../spot/spot.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(FishingSpot) private spotRepo: Repository<FishingSpot>,
    @Inject('REDIS_CLIENT') private redis: any,
    private spotService: SpotService,
  ) {}

  // async findBySpot(spotId: string, page: number = 1, limit: number = 10) {
  //   const [data, total] = await this.postRepo.findAndCount({
  //     where: { spotId },
  //     relations: ['user'],
  //     order: { createdAt: 'DESC' },
  //     skip: (page - 1) * limit,
  //     take: limit,
  //   });
  //   return { data, total, page, limit };
  // }

  // async findBySpot(spotId: string, page: number = 1, limit: number = 10) {
  //   // 二次保险：确保 page 和 limit 是有效正整数
  //   const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  //   const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
    
  //   const skip = (safePage - 1) * safeLimit;
    
  //   const [data, total] = await this.postRepo.findAndCount({
  //     where: { spotId },
  //     relations: ['user'],
  //     order: { createdAt: 'DESC' },
  //     skip: skip,
  //     take: safeLimit,
  //   });
    
  //   return { data, total, page: safePage, limit: safeLimit };
  // }

  // async findBySpot(spotId: string, page: number = 1, limit: number = 10) {
  //   // 确保分页参数有效
  //   const safePage = Math.max(1, Number(page) || 1);
  //   const safeLimit = Math.max(1, Number(limit) || 10);
  //   const skip = (safePage - 1) * safeLimit;

  //   // 使用 QueryBuilder 避免 distinctAlias 问题
  //   const qb = this.postRepo.createQueryBuilder('post')
  //     .leftJoinAndSelect('post.user', 'user')
  //     .where('post.spotId = :spotId', { spotId })
  //     .orderBy('post.createdAt', 'DESC')
  //     .skip(skip)
  //     .take(safeLimit);

  //   // 获取分页数据和总数
  //   const [data, total] = await qb.getManyAndCount();

  //   return {
  //     data,
  //     total,
  //     page: safePage,
  //     limit: safeLimit,
  //   };
  // }

  async findBySpot(spotId: string, page: number = 1, limit: number = 10) {
    const realSpotId = await this.resolveSpotId(spotId);
    if (!realSpotId) return { data: [], total: 0, page: Math.max(1, Number(page) || 1), limit: Math.max(1, Number(limit) || 10) };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const skip = (safePage - 1) * safeLimit;

    const qb = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.spotId = :spotId', { spotId: realSpotId })
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(safeLimit);

    // 关键修改：分开调用，避免 getManyAndCount 的内部 bug
    const [data, total] = await Promise.all([
      qb.getMany(),   // 获取当前页数据
      qb.getCount(),  // 获取总记录数
    ]);

    return { data, total, page: safePage, limit: safeLimit };
  }

  private async resolveSpotId(spotId: string) {
    if (!spotId) return '';
    if (!spotId.startsWith('amap_')) return spotId;
    const sourcePoiId = spotId.replace(/^amap_/, '');
    const spot = await this.spotRepo.findOne({ where: { sourcePoiId } });
    return spot?.id || '';
  }

  async findOne(id: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      //relations: ['user', 'spot', 'comments', 'comments.user'],
      relations: { user: true, spot: true, comments: { user: true } }
    });
    if (!post) throw new NotFoundException();
    return post;
  }

  async create(dto: CreatePostDto, userId: string) {
    if (!dto.spotId && !dto.candidateSpot) throw new ForbiddenException('必须选择钓点标记');
    const imageUrls = normalizePostImages(dto.images || []);

    const spot = dto.candidateSpot
      ? await this.spotService.findOrCreateFromCandidate(dto.candidateSpot)
      : await this.spotRepo.findOne({ where: { id: dto.spotId } });
    if (!spot) throw new NotFoundException('钓点不存在');

    const post = this.postRepo.create({
      userId,
      spotId: spot.id,
      title: dto.title,
      content: dto.content,
      images: imageUrls,
      fishCategories: dto.fishCategories || [],
      spotEvaluation: dto.spotEvaluation,
    });

    const saved = await this.postRepo.save(post);

    await this.spotRepo.increment({ id: spot.id }, 'postCount', 1);
    if (dto.fishCategories?.length) {
      const existingFishCategories = new Set(spot.fishCategories || []);
      const existingFishTypes = new Set(spot.fishTypes || []);
      dto.fishCategories.forEach((fish) => {
        existingFishCategories.add(fish);
        existingFishTypes.add(fish);
      });
      spot.fishCategories = Array.from(existingFishCategories);
      spot.fishTypes = Array.from(existingFishTypes);
      await this.spotRepo.save(spot);
    }
    if (dto.spotEvaluation) {
      const existing = new Set(spot.evaluations || []);
      existing.add(dto.spotEvaluation);
      spot.evaluations = Array.from(existing);
      await this.spotRepo.save(spot);
    }

    await this.redis.del(`draft:${userId}`);
    await this.redis.zincrby('spots:hot', 3, spot.id);

    return saved;
  }

  async remove(id: string, userId: string) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException();
    if (post.userId !== userId) throw new ForbiddenException('无权删除');

    await this.postRepo.remove(post);
    await this.spotRepo.decrement({ id: post.spotId }, 'postCount', 1);
    await this.redis.zincrby('spots:hot', -3, post.spotId);
    return { success: true };
  }
}

function normalizePostImages(images: string[]) {
  return images.map((image) => {
    if (!image) return image;
    if (/^data:image\//i.test(image) || image.length > 2000) {
      throw new BadRequestException('图片必须先上传到对象存储后再发布');
    }
    if (!/^https?:\/\//i.test(image)) {
      throw new BadRequestException('图片地址格式不正确');
    }
    return image;
  });
}
