import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { jsonArrayTransformer } from '@/common/transformers/json-array.transformer';

@Entity('drafts')
export class Draft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'spot_id', nullable: true })
  spotId: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
