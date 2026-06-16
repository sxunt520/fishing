import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '@/entities/comment.entity';
import { Post } from '@/entities/post.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
  ) {}

  async findAll(postId: string, page: number, limit: number) {
    const [data, total] = await this.commentRepo.findAndCount({
      where: { postId },
      //relations: ['user'],
      relations: { user: true, replyToUser: true },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async create(postId: string, content: string, userId: string, parentId?: string, replyToUserId?: string) {
    const safeContent = String(content || '').trim();
    if (!safeContent) throw new BadRequestException('评论内容不能为空');
    const comment = this.commentRepo.create({
      postId,
      userId,
      content: safeContent,
      parentId: parentId || null,
      replyToUserId: replyToUserId || null,
    });
    const saved = await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    return this.commentRepo.findOne({
      where: { id: saved.id },
      relations: { user: true, replyToUser: true },
    });
  }
}
