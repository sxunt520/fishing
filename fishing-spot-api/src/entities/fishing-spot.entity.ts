import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { Post } from './post.entity';

@Entity('fishing_spots')
export class FishingSpot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 200 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({ type: 'simple-json', nullable: true, comment: '推荐鱼种' })
  fishTypes: string[];

  @Column({ type: 'simple-json', nullable: true, comment: '聚合鱼获标签' })
  fishCategories: string[];

  @Column({ type: 'simple-json', nullable: true, comment: '聚合评价标签' })
  evaluations: string[];

  @Column({ default: 0, name: 'post_count' })
  postCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Post, (post) => post.spot)
  posts: Post[];
}
