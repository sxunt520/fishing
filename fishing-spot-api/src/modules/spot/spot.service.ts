import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { CreateSpotDto } from './dto/spot.dto';
import axios from 'axios';

const WATER_KEYWORDS = ['湖', '河', '江', '水库', '湿地', '海', '湾', '溪', '塘', '渠', '泊'];
const EXCLUDE_KEYWORDS = ['公司', '酒店', '宾馆', '餐厅', '饭店', '学校', '停车场', '小区', '大厦', '商场', '超市'];

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

  async searchSpots(keyword: string, lat?: number, lng?: number, limit: number = 20) {
    const safeKeyword = String(keyword || '').trim();
    if (!safeKeyword) throw new BadRequestException('keyword 是必需的');
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
    const like = `%${safeKeyword}%`;

    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      const query = `
        SELECT
          id, name, address, latitude, longitude,
          fishTypes, fishCategories, evaluations,
          post_count AS postCount,
          source, source_poi_id AS sourcePoiId, status, confidence,
          ROUND(
            6371 * ACOS(
              LEAST(1, GREATEST(-1,
                COS(RADIANS(latitude)) * COS(RADIANS(?)) * COS(RADIANS(longitude) - RADIANS(?)) +
                SIN(RADIANS(latitude)) * SIN(RADIANS(?))
              ))
            ), 2
          ) AS distance
        FROM fishing_spots
        WHERE name LIKE ? OR address LIKE ?
        ORDER BY distance ASC, post_count DESC
        LIMIT ?
      `;
      return this.spotRepo.query(query, [lat, lng, lat, like, like, safeLimit]);
    }

    return this.spotRepo
      .createQueryBuilder('spot')
      .where('spot.name LIKE :keyword OR spot.address LIKE :keyword', { keyword: like })
      .orderBy('spot.post_count', 'DESC')
      .limit(safeLimit)
      .getMany();
  }

  async findWaterCandidates(lat: number, lng: number, radius: number = 5000, limit: number = 30) {
    if ([lat, lng, radius, limit].some(v => typeof v !== 'number' || isNaN(v))) {
      throw new BadRequestException('参数 lat, lng, radius, limit 必须是有效数字');
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('经纬度超出范围');
    }

    const key = process.env.AMAP_WEB_SERVICE_KEY || process.env.AMAP_WEB_KEY || process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
    if (!key) {
      console.warn('[AMap] 未配置 AMAP_WEB_SERVICE_KEY，无法加载水域候选点');
      return [];
    }

    const keywords = ['湖泊', '河流', '水库', '湿地', '海湾', '江', '湖', '河'];
    const results: any[] = [];

    await Promise.all(
      keywords.map(async (keyword) => {
        try {
          const { data } = await axios.get('https://restapi.amap.com/v3/place/around', {
            timeout: 5000,
            params: {
              key,
              location: `${lng},${lat}`,
              keywords: keyword,
              radius: Math.min(Math.max(radius, 500), 50000),
              offset: 20,
              page: 1,
              extensions: 'base',
              sortrule: 'distance',
            },
          });
          if (data?.status === '1' && Array.isArray(data.pois)) {
            results.push(...data.pois);
          } else if (data?.info) {
            console.warn(`[AMap] 水域候选搜索失败: ${data.info}`);
          }
        } catch (error: any) {
          console.warn(`[AMap] 水域候选搜索异常: ${error.message}`);
        }
      }),
    );

    const deduped = new Map<string, any>();
    for (const poi of results) {
      const [poiLng, poiLat] = String(poi.location || '').split(',').map(Number);
      if (!poi.id || !poi.name || isNaN(poiLat) || isNaN(poiLng)) continue;
      if (!isWaterPoi(poi.name, poi.type)) continue;
      if (EXCLUDE_KEYWORDS.some((word) => String(poi.name).includes(word))) continue;
      if (!deduped.has(poi.id)) {
        deduped.set(poi.id, {
          id: `amap_${poi.id}`,
          source: 'amap',
          sourcePoiId: poi.id,
          name: poi.name,
          address: poi.address || poi.pname || poi.cityname || '',
          latitude: poiLat,
          longitude: poiLng,
          distance: poi.distance ? Math.round(Number(poi.distance)) : null,
          type: poi.type,
          status: 'candidate',
          confidence: 0.45,
          isCandidate: true,
        });
      }
    }

    const candidates = Array.from(deduped.values())
      .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999))
      .slice(0, Math.max(1, Math.min(limit, 50)));

    if (candidates.length === 0) return [];

    const poiIds = candidates.map((candidate) => candidate.sourcePoiId);
    const existing = await this.spotRepo
      .createQueryBuilder('spot')
      .where('spot.source_poi_id IN (:...poiIds)', { poiIds })
      .getMany();
    const existingByPoiId = new Map(existing.map((spot) => [spot.sourcePoiId, spot]));

    return candidates.map((candidate) => {
      const spot = existingByPoiId.get(candidate.sourcePoiId);
      if (!spot) return candidate;
      return {
        ...candidate,
        id: spot.id,
        status: spot.status,
        postCount: spot.postCount,
        fishTypes: spot.fishTypes || [],
        fishCategories: spot.fishCategories || [],
        evaluations: spot.evaluations || [],
        isCandidate: spot.status !== 'verified',
        savedSpotId: spot.id,
      };
    });
  }

  async searchWaterCandidates(keyword: string, lat: number, lng: number, radius: number = 10000, limit: number = 20) {
    const safeKeyword = String(keyword || '').trim();
    if (!safeKeyword) throw new BadRequestException('keyword 是必需的');
    if ([lat, lng, radius, limit].some(v => typeof v !== 'number' || isNaN(v))) {
      throw new BadRequestException('参数 lat, lng, radius, limit 必须是有效数字');
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('经纬度超出范围');
    }

    const key = process.env.AMAP_WEB_SERVICE_KEY || process.env.AMAP_WEB_KEY || process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
    if (!key) {
      console.warn('[AMap] 未配置 AMAP_WEB_SERVICE_KEY，无法搜索水域候选点');
      return [];
    }

    try {
      const { data } = await axios.get('https://restapi.amap.com/v3/place/around', {
        timeout: 5000,
        params: {
          key,
          location: `${lng},${lat}`,
          keywords: safeKeyword,
          radius: Math.min(Math.max(radius, 500), 50000),
          offset: Math.max(1, Math.min(limit, 50)),
          page: 1,
          extensions: 'base',
          sortrule: 'distance',
        },
      });
      if (data?.status !== '1' || !Array.isArray(data.pois)) {
        console.warn(`[AMap] 水域关键词搜索失败: ${data?.info || 'unknown'}`);
        return [];
      }
      return this.normalizeWaterPois(data.pois, limit);
    } catch (error: any) {
      console.warn(`[AMap] 水域关键词搜索异常: ${error.message}`);
      return [];
    }
  }

  async findIpLocation() {
    const key = process.env.AMAP_WEB_SERVICE_KEY || process.env.AMAP_WEB_KEY || process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
    if (!key) {
      console.warn('[AMap] 未配置 AMAP_WEB_SERVICE_KEY，无法进行 IP 定位');
      return null;
    }

    try {
      const { data } = await axios.get('https://restapi.amap.com/v3/ip', {
        timeout: 5000,
        params: { key },
      });
      if (data?.status !== '1') {
        console.warn(`[AMap] IP 定位失败: ${data?.info || 'unknown'}`);
        return null;
      }
      const rectangle = String(data.rectangle || '');
      const points = rectangle.split(';').map((item) => item.split(',').map(Number));
      const validPoints = points.filter(([lng, lat]) => !isNaN(lat) && !isNaN(lng));
      if (validPoints.length === 0) return null;
      const longitude = validPoints.reduce((sum, [lng]) => sum + lng, 0) / validPoints.length;
      const latitude = validPoints.reduce((sum, [, lat]) => sum + lat, 0) / validPoints.length;
      return {
        latitude,
        longitude,
        province: data.province || '',
        city: data.city || '',
        adcode: data.adcode || '',
        source: 'amap-ip',
      };
    } catch (error: any) {
      console.warn(`[AMap] IP 定位异常: ${error.message}`);
      return null;
    }
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
      source: 'user',
      status: 'verified',
      confidence: 0.8,
    });
    return this.spotRepo.save(spot);
  }

  async findOrCreateFromCandidate(candidate: {
    sourcePoiId?: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    source?: string;
  }) {
    if (!candidate?.name || candidate.latitude == null || candidate.longitude == null) {
      throw new BadRequestException('候选钓点信息不完整');
    }

    if (candidate.sourcePoiId) {
      const existingByPoi = await this.spotRepo.findOne({ where: { sourcePoiId: candidate.sourcePoiId } });
      if (existingByPoi) {
        existingByPoi.status = 'verified';
        existingByPoi.confidence = Math.max(Number(existingByPoi.confidence || 0), 0.75);
        return this.spotRepo.save(existingByPoi);
      }
    }

    const existingNearby = await this.spotRepo
      .createQueryBuilder('spot')
      .where('ABS(spot.latitude - :lat) < 0.0002', { lat: candidate.latitude })
      .andWhere('ABS(spot.longitude - :lng) < 0.0002', { lng: candidate.longitude })
      .andWhere('spot.name = :name', { name: candidate.name })
      .getOne();
    if (existingNearby) {
      existingNearby.status = 'verified';
      existingNearby.confidence = Math.max(Number(existingNearby.confidence || 0), 0.75);
      return this.spotRepo.save(existingNearby);
    }

    const spot = this.spotRepo.create({
      name: candidate.name,
      address: candidate.address || '',
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      fishTypes: [],
      fishCategories: [],
      evaluations: [],
      source: candidate.source || 'amap',
      sourcePoiId: candidate.sourcePoiId || null,
      status: 'verified',
      confidence: 0.75,
    });
    return this.spotRepo.save(spot);
  }

  private async normalizeWaterPois(pois: any[], limit: number) {
    const deduped = new Map<string, any>();
    for (const poi of pois) {
      const [poiLng, poiLat] = String(poi.location || '').split(',').map(Number);
      if (!poi.id || !poi.name || isNaN(poiLat) || isNaN(poiLng)) continue;
      if (!isWaterPoi(poi.name, poi.type)) continue;
      if (EXCLUDE_KEYWORDS.some((word) => String(poi.name).includes(word))) continue;
      if (!deduped.has(poi.id)) {
        deduped.set(poi.id, {
          id: `amap_${poi.id}`,
          source: 'amap',
          sourcePoiId: poi.id,
          name: poi.name,
          address: poi.address || poi.pname || poi.cityname || '',
          latitude: poiLat,
          longitude: poiLng,
          distance: poi.distance ? Math.round(Number(poi.distance)) : null,
          type: poi.type,
          status: 'candidate',
          confidence: 0.45,
          isCandidate: true,
        });
      }
    }

    const candidates = Array.from(deduped.values())
      .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999))
      .slice(0, Math.max(1, Math.min(limit, 50)));

    if (candidates.length === 0) return [];

    const poiIds = candidates.map((candidate) => candidate.sourcePoiId);
    const existing = await this.spotRepo
      .createQueryBuilder('spot')
      .where('spot.source_poi_id IN (:...poiIds)', { poiIds })
      .getMany();
    const existingByPoiId = new Map(existing.map((spot) => [spot.sourcePoiId, spot]));

    return candidates.map((candidate) => {
      const spot = existingByPoiId.get(candidate.sourcePoiId);
      if (!spot) return candidate;
      return {
        ...candidate,
        id: spot.id,
        status: spot.status,
        postCount: spot.postCount,
        fishTypes: spot.fishTypes || [],
        fishCategories: spot.fishCategories || [],
        evaluations: spot.evaluations || [],
        isCandidate: spot.status !== 'verified',
        savedSpotId: spot.id,
      };
    });
  }
}

function isWaterPoi(name = '', type = '') {
  const text = `${name} ${type}`;
  return WATER_KEYWORDS.some((word) => text.includes(word));
}
