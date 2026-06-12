import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from '@/entities/like.entity';
import { Post } from '@/entities/post.entity';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Like) private likeRepo: Repository<Like>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async like(postId: string, userId: string) {
    try {
      // 直接创建并保存，利用唯一约束防止重复
      const like = this.likeRepo.create({ postId, userId });
      await this.likeRepo.save(like);
    } catch (error) {
      // MySQL 重复键错误码
      if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
        throw new ConflictException('已点赞');
      }
      throw error;
    }

    // 更新帖子点赞数（注意：如果更新失败，已插入的 like 不会回滚，但概率极低，可接受）
    await this.postRepo.increment({ id: postId }, 'likeCount', 1);

    // 获取最新点赞数（直接查 post 表，避免多一次查询）
    //const updatedPost = await this.postRepo.findOne({ where: { id: postId }, select: ['likeCount'] });
    const updatedPost = await this.postRepo.findOne({ where: { id: postId }, select: { likeCount: true } });
    const newLikeCount = updatedPost?.likeCount || 0;

    // Redis 更新（非关键操作，错误不影响返回）
    this.redis.zincrby('posts:hot', 1, postId).catch(err => {
      console.error('Redis zincrby failed for like:', err);
    });

    return { liked: true, likeCount: newLikeCount };
  }

  async unlike(postId: string, userId: string) {
    // 直接删除，并获取删除结果
    const deleteResult = await this.likeRepo.delete({ postId, userId });
    if (deleteResult.affected === 0) {
      throw new NotFoundException('未点赞');
    }

    // 减少点赞计数
    await this.postRepo.decrement({ id: postId }, 'likeCount', 1);

    // 获取最新点赞数
    //const updatedPost = await this.postRepo.findOne({ where: { id: postId }, select: ['likeCount'] });
    const updatedPost = await this.postRepo.findOne({ where: { id: postId }, select: { likeCount: true } });
    const newLikeCount = updatedPost?.likeCount || 0;

    // Redis 更新
    this.redis.zincrby('posts:hot', -1, postId).catch(err => {
      console.error('Redis zincrby failed for unlike:', err);
    });

    return { liked: false, likeCount: newLikeCount };
  }
}