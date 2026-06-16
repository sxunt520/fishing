import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/entities/user.entity';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async getProfile(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      //select: ['id', 'phone', 'nickname', 'avatar', 'createdAt'],
      select: { id: true, phone: true, nickname: true, avatar: true, createdAt: true }
    });
  }

  async updateProfile(userId: string, dto: { nickname?: string; avatar?: string }) {
    await this.userRepo.update({ id: userId }, dto);
    return this.getProfile(userId);
  }
}
