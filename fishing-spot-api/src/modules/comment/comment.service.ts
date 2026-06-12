import { Injectable } from '@nestjs/common';
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
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async create(postId: string, content: string, userId: string) {
    const comment = this.commentRepo.create({ postId, userId, content });
    await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    return comment;
  }
}
