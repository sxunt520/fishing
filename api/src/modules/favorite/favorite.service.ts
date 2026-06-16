import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class FavoriteService {
  constructor(@Inject('REDIS_CLIENT') private redis: any) {}

  async addFavorite(userId: string, spotId: string) {
    await this.redis.sadd(`user:${userId}:favorites`, spotId);
    await this.redis.zincrby('spots:hot', 5, spotId);
    return { favorited: true };
  }

  async removeFavorite(userId: string, spotId: string) {
    await this.redis.srem(`user:${userId}:favorites`, spotId);
    await this.redis.zincrby('spots:hot', -5, spotId);
    return { favorited: false };
  }

  async getFavorites(userId: string) {
    const ids = await this.redis.smembers(`user:${userId}:favorites`);
    return { spotIds: ids };
  }
}
