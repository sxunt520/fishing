import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { CreateSpotDto } from './dto/spot.dto';

@Injectable()
export class SpotService {
  constructor(
    @InjectRepository(FishingSpot) private spotRepo: Repository<FishingSpot>,
  ) {}

  async findInBounds(north: number, south: number, east: number, west: number) {
    return this.spotRepo
      .createQueryBuilder('spot')
      .where('spot.latitude <= :north AND spot.latitude >= :south', { north, south })
      .andWhere('spot.longitude <= :east AND spot.longitude >= :west', { east, west })
      .orderBy('spot.post_count', 'DESC')
      .getMany();
  }

  // async findNearby(lat: number, lng: number, radius: number = 10, limit: number = 20) {

  //   // 1️⃣ 校验参数是否为有效数字
  //   if ([lat, lng, radius, limit].some(v => isNaN(v) || v === null || v === undefined)) {
  //     throw new BadRequestException('参数 lat, lng, radius, limit 必须是有效数字');
  //   }
  //   // 可选：范围限制
  //   if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
  //     throw new BadRequestException('经纬度超出范围');
  //   }
  //   if (radius <= 0) {
  //     throw new BadRequestException('radius 必须大于 0');
  //   }

  //   const query = `
  //     SELECT 
  //       id, name, address, latitude, longitude, 
  //       fishTypes, post_count as postCount,
  //       ROUND(ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) / 1000, 2) as distance
  //     FROM fishing_spots
  //     WHERE ST_Distance_Sphere(point(longitude, latitude), point(?, ?)) <= ? * 1000
  //     ORDER BY distance ASC, post_count DESC
  //     LIMIT ?
  //   `;
  //   return this.spotRepo.query(query, [lng, lat, lng, lat, radius, limit]);
  // }

  async findNearby(lat: number, lng: number, radius: number = 10, limit: number = 20) {
    // 1. 参数校验（防止 NaN 进入 SQL）
    if ([lat, lng, radius, limit].some(v => typeof v !== 'number' || isNaN(v))) {
      throw new BadRequestException('参数 lat, lng, radius, limit 必须是有效数字');
    }

    // 2. 使用 Haversine 公式计算距离（公里）
    const query = `
      SELECT 
        id, name, address, latitude, longitude,
        fishTypes,
        post_count AS postCount,
        ROUND(
          6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(latitude)) * COS(RADIANS(?)) * COS(RADIANS(longitude) - RADIANS(?)) +
              SIN(RADIANS(latitude)) * SIN(RADIANS(?))
            ))
          ), 2
        ) AS distance
      FROM fishing_spots
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      HAVING distance <= ?
      ORDER BY distance ASC, post_count DESC
      LIMIT ?
    `;

    // 参数顺序: lat, lng, lat, radius, limit
    return this.spotRepo.query(query, [lat, lng, lat, radius, limit]);
  }

  // async findOne(id: string, lat?: number, lng?: number) {
  //   const spot = await this.spotRepo.findOne({ where: { id } });
  //   if (!spot) throw new NotFoundException('钓点不存在');

  //   let distance = null;
  //   if (lat != null && lng != null) {
  //     const [res] = await this.spotRepo.query(
  //       `SELECT ROUND(ST_Distance_Sphere(point(?, ?), point(?, ?)) / 1000, 2) as d`,
  //       [spot.longitude, spot.latitude, lng, lat],
  //     );
  //     distance = res?.d;
  //   }
  //   return { ...spot, distance };
  // }
  async findOne(id: string, lat?: number, lng?: number) {
    const spot = await this.spotRepo.findOne({ where: { id } });
    if (!spot) throw new NotFoundException('钓点不存在');

    let distance = null;
    // 只有明确传入了有效的经纬度时才计算距离
    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      const [res] = await this.spotRepo.query(
        `SELECT ROUND(
          6371 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(latitude)) * COS(RADIANS(?)) * COS(RADIANS(?) - RADIANS(longitude)) +
              SIN(RADIANS(latitude)) * SIN(RADIANS(?))
            ))
          ), 2
        ) AS d
        FROM (SELECT ? AS latitude, ? AS longitude) AS spot`,
        [lat, lng, lat, spot.latitude, spot.longitude],
      );
      distance = res?.d;
    }
    return { ...spot, distance };
  }

  async create(dto: CreateSpotDto) {
    const spot = this.spotRepo.create({
      name: dto.name,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      fishTypes: dto.fishTypes || [],
    });
    return this.spotRepo.save(spot);
  }
}
