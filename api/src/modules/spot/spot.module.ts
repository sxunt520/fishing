import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotController } from './spot.controller';
import { SpotService } from './spot.service';
import { FishingSpot } from '@/entities/fishing-spot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FishingSpot])],
  controllers: [SpotController],
  providers: [SpotService],
  exports: [SpotService],
})
export class SpotModule {}
