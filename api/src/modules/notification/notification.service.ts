import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class NotificationService {
  constructor(@Inject('REDIS_CLIENT') private redis: any) {}

  async notify(userId: string, type: 'like' | 'comment' | 'follow', data: any) {
    const item = JSON.stringify({ type, data, read: false, createdAt: new Date().toISOString() });
    await this.redis.lpush(`notifications:${userId}`, item);
    await this.redis.ltrim(`notifications:${userId}`, 0, 99);
    return { success: true };
  }

  async getNotifications(userId: string, page: number = 1) {
    const list = await this.redis.lrange(`notifications:${userId}`, (page - 1) * 20, page * 20 - 1);
    return list.map((i: string) => JSON.parse(i));
  }
}
