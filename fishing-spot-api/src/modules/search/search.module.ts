import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { FishingSpot } from '@/entities/fishing-spot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FishingSpot])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
