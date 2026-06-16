import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { Post } from '@/entities/post.entity';
import { User } from '@/entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([FishingSpot, Post, User])],
  providers: [SeedService],
})
export class SeedModule {}
