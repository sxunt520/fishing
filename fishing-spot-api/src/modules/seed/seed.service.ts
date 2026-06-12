import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { Post } from '@/entities/post.entity';
import { User } from '@/entities/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(FishingSpot) private readonly spotRepo: Repository<FishingSpot>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.spotRepo.count();
    if (count > 0) return;

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: '18800000000',
        nickname: '空军1号',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=fishing',
        passwordHash: await bcrypt.hash('123456', 10),
      }),
    );

    const spots = await this.spotRepo.save([
      this.spotRepo.create({
        name: '明湖',
        address: '海淀区-西长安街',
        latitude: 39.9083,
        longitude: 116.3939,
        fishTypes: ['鲫鱼', '草鱼', '鲤鱼'],
        fishCategories: ['鲫鱼', '草鱼'],
        evaluations: ['野钓', '新手友好'],
        postCount: 1,
      }),
      this.spotRepo.create({
        name: '太湖',
        address: '海淀区-西长安街',
        latitude: 39.9142,
        longitude: 116.3979,
        fishTypes: ['鲫鱼', '鲢鳙'],
        fishCategories: ['鲫鱼'],
        evaluations: ['水库'],
        postCount: 1,
      }),
      this.spotRepo.create({
        name: '午门东侧水湾',
        address: '东城区-故宫东侧',
        latitude: 39.9129,
        longitude: 116.4071,
        fishTypes: ['草鱼', '鲤鱼'],
        fishCategories: ['草鱼'],
        evaluations: ['黑坑'],
        postCount: 0,
      }),
      this.spotRepo.create({
        name: '前门护城河',
        address: '东城区-前门东大街',
        latitude: 39.8999,
        longitude: 116.3974,
        fishTypes: ['鲫鱼', '黑鱼'],
        fishCategories: ['黑鱼'],
        evaluations: ['野钓'],
        postCount: 0,
      }),
    ]);

    await this.postRepo.save([
      this.postRepo.create({
        userId: user.id,
        spotId: spots[0].id,
        title: '傍晚口很好',
        content: '鱼多爆护，人还少！速速来！ #鲫鱼 #草鱼 #野钓',
        images: ['https://picsum.photos/seed/fishing-1/600/600', 'https://picsum.photos/seed/fishing-2/600/600'],
        fishCategories: ['鲫鱼', '草鱼'],
        spotEvaluation: '野钓',
        likeCount: 6,
        commentCount: 0,
      }),
      this.postRepo.create({
        userId: user.id,
        spotId: spots[1].id,
        title: '水面宽，适合慢守',
        content: '今天用玉米守到一尾大鲤，风小的时候更舒服。 #鲫鱼 #水库',
        images: ['https://picsum.photos/seed/fishing-3/600/600'],
        fishCategories: ['鲫鱼'],
        spotEvaluation: '水库',
        likeCount: 3,
        commentCount: 0,
      }),
    ]);
  }
}
