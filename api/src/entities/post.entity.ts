import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { FishingSpot } from './fishing-spot.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { jsonArrayTransformer } from '@/common/transformers/json-array.transformer';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.posts, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'spot_id' })
  spotId: string;

  @ManyToOne(() => FishingSpot, (spot) => spot.posts)
  @JoinColumn({ name: 'spot_id' })
  spot: FishingSpot;

  @Column({ length: 200, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true, transformer: jsonArrayTransformer })
  images: string[];

  @Column({ type: 'text', nullable: true, name: 'fish_categories', transformer: jsonArrayTransformer })
  fishCategories: string[];

  @Column({ nullable: true, name: 'spot_evaluation' })
  spotEvaluation: string;

  @Column({ default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ default: 0, name: 'comment_count' })
  commentCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];
}
