import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DraftController } from './draft.controller';
import { DraftService } from './draft.service';
import { Draft } from '@/entities/draft.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Draft])],
  controllers: [DraftController],
  providers: [DraftService],
})
export class DraftModule {}
