import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FishingSpot } from '@/entities/fishing-spot.entity';

@Injectable()
export class SearchService {
  constructor(@InjectRepository(FishingSpot) private spotRepo: Repository<FishingSpot>) {}

  async searchSpots(q: string, lat: number, lng: number) {
    const query = `
      SELECT *, 
        ROUND(ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) / 1000, 2) as distance
      FROM fishing_spots
      WHERE name LIKE ? OR address LIKE ?
      ORDER BY post_count DESC, distance ASC
      LIMIT 20
    `;
    return this.spotRepo.query(query, [lng, lat, `%${q}%`, `%${q}%`]);
  }
}
