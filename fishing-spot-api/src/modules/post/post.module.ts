import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Post } from '@/entities/post.entity';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { SpotModule } from '../spot/spot.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, FishingSpot]), SpotModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
