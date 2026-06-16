import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FishingSpot } from '@/entities/fishing-spot.entity';
import { CreateSpotDto, UserCandidateDto } from './dto/spot.dto';
import axios from 'axios';

const WATER_KEYWORDS = ['湖', '河', '江', '水库', '湿地', '海', '湾', '溪', '塘', '渠', '泊'];
const EXCLUDE_KEYWORDS = ['公司', '酒店', '宾馆', '餐厅', '饭店', '学校', '停车场', '小区', '大厦', '商场', '超市', '医院', '机场', '高速', '写字楼', '办公楼'];
const AUTO_APPROVE_CONFIDENCE = 0.65;
const REVIEW_CONFIDENCE = 0.4;
const DUPLICATE_DISTANCE_METERS = 120;

@Injectable()
export class SpotService {
  constructor(
    @InjectRepository(FishingSpot) private spotRepo: Repository<FishingSpot>,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async findInBounds(north: number, south: number, east: number, west: number) {
    return this.spotRepo
      .createQueryBuilder('spot')
      .where('spot.latitude <= :north AND spot.latitude >= :south', { north, south })
      .andWhere('spot.longitude <= :east AND spot.longitude >= :west', { east, west })
      .andWhere('spot.status = :status', { status: 'verified' })
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
        AND status = 'verified'
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
        WHERE status = 'verified' AND (name LIKE ? OR address LIKE ?)
        ORDER BY distance ASC, post_count DESC
        LIMIT ?
      `;
      return this.spotRepo.query(query, [lat, lng, lat, like, like, safeLimit]);
    }

    return this.spotRepo
      .createQueryBuilder('spot')
      .where('spot.status = :status', { status: 'verified' })
      .andWhere('(spot.name LIKE :keyword OR spot.address LIKE :keyword)', { keyword: like })
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

    const dbCandidates = await this.findDbCandidatesNearby(lat, lng, radius, limit);
    const key = getAmapServiceKey();
    if (!key) {
      console.warn('[AMap] 未配置 AMAP_WEB_SERVICE_KEY，无法加载水域候选点');
      return dbCandidates;
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

    const poiIds = candidates.map((candidate) => candidate.sourcePoiId);
    const existing = poiIds.length
      ? await this.spotRepo
        .createQueryBuilder('spot')
        .where('spot.source_poi_id IN (:...poiIds)', { poiIds })
        .getMany()
      : [];
    const existingByPoiId = new Map(existing.map((spot) => [spot.sourcePoiId, spot]));

    const amapCandidates = candidates.map((candidate) => {
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
    return mergeCandidateResults(dbCandidates, amapCandidates)
      .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999))
      .slice(0, Math.max(1, Math.min(limit, 50)));
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

    const dbCandidates = await this.searchDbCandidates(safeKeyword, lat, lng, radius, limit);
    const key = getAmapServiceKey();
    if (!key) {
      console.warn('[AMap] 未配置 AMAP_WEB_SERVICE_KEY，无法搜索水域候选点');
      return dbCandidates;
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
        return dbCandidates;
      }
      const amapCandidates = await this.normalizeWaterPois(data.pois, limit);
      return mergeCandidateResults(dbCandidates, amapCandidates)
        .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999))
        .slice(0, Math.max(1, Math.min(limit, 50)));
    } catch (error: any) {
      console.warn(`[AMap] 水域关键词搜索异常: ${error.message}`);
      return dbCandidates;
    }
  }

  async findIpLocation() {
    const key = getAmapServiceKey();
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

  async validateUserCandidate(lat: number, lng: number) {
    this.assertValidLatLng(lat, lng);
    const duplicate = await this.findNearestSpot(lat, lng, DUPLICATE_DISTANCE_METERS);
    if (duplicate) {
      return {
        allowed: false,
        status: duplicate.status,
        confidence: Number(duplicate.confidence || 0),
        reason: duplicate.status === 'verified' ? '附近已经有真实钓点了' : '附近已经有可探索钓点了',
        existingSpot: this.toCandidateResponse(duplicate, Number(duplicate.distanceMeters)),
      };
    }

    const context = await this.inspectLocationContext(lat, lng);
    const validation = scoreCandidateContext(context);
    return {
      ...validation,
      latitude: lat,
      longitude: lng,
      suggestedName: context.waterPoi?.name || context.regeo?.name || '未命名可探索点',
      address: context.regeo?.address || context.waterPoi?.address || '',
      nearestWater: context.waterPoi,
    };
  }

  async createUserCandidate(dto: UserCandidateDto, userId: string) {
    const lat = Number(dto.latitude);
    const lng = Number(dto.longitude);
    this.assertValidLatLng(lat, lng);
    await this.checkCandidateRateLimit(userId);

    const validation: any = await this.validateUserCandidate(lat, lng);
    if (validation.existingSpot) return validation.existingSpot;

    const status = validation.confidence >= AUTO_APPROVE_CONFIDENCE
      ? 'candidate'
      : validation.confidence >= REVIEW_CONFIDENCE
        ? 'pending_review'
        : 'rejected';

    if (status === 'rejected') {
      throw new BadRequestException(validation.reason || '附近未识别到可垂钓水域，换个更靠近河湖的位置试试');
    }

    const spot = this.spotRepo.create({
      name: normalizeSpotName(dto.name || validation.suggestedName),
      address: validation.address || '',
      latitude: lat,
      longitude: lng,
      fishTypes: [],
      fishCategories: [],
      evaluations: [],
      source: 'user',
      submittedBy: userId,
      status,
      confidence: validation.confidence,
    });
    const saved = await this.spotRepo.save(spot);
    return {
      ...this.toCandidateResponse(saved),
      message: status === 'candidate'
        ? '已新增为可探索钓点'
        : '已提交审核，审核通过后会显示在地图上',
      autoApproved: status === 'candidate',
    };
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

  private assertValidLatLng(lat: number, lng: number) {
    if ([lat, lng].some(v => typeof v !== 'number' || isNaN(v))) {
      throw new BadRequestException('lat 和 lng 是必需的且必须为数字');
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
      throw new BadRequestException('经纬度无效');
    }
  }

  private async checkCandidateRateLimit(userId: string) {
    const dayKey = `spot:candidate:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const burstKey = `spot:candidate:burst:${userId}`;
    const [dayCount, burstCount] = await Promise.all([
      this.redis.incr(dayKey),
      this.redis.incr(burstKey),
    ]);
    if (dayCount === 1) await this.redis.expire(dayKey, 86400);
    if (burstCount === 1) await this.redis.expire(burstKey, 300);
    if (dayCount > 10) throw new BadRequestException('今天新增钓点次数已达上限，明天再来试试');
    if (burstCount > 3) throw new BadRequestException('提交太频繁了，稍等几分钟再试');
  }

  private async findNearestSpot(lat: number, lng: number, maxDistanceMeters: number) {
    const query = `
      SELECT *,
        (
          6371000 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(latitude)) * COS(RADIANS(?)) * COS(RADIANS(longitude) - RADIANS(?)) +
              SIN(RADIANS(latitude)) * SIN(RADIANS(?))
            ))
          )
        ) AS distanceMeters
      FROM fishing_spots
      WHERE status IN ('verified', 'candidate', 'pending_review')
      HAVING distanceMeters <= ?
      ORDER BY FIELD(status, 'verified', 'candidate', 'pending_review'), distanceMeters ASC
      LIMIT 1
    `;
    const [spot] = await this.spotRepo.query(query, [lat, lng, lat, maxDistanceMeters]);
    return spot || null;
  }

  private async inspectLocationContext(lat: number, lng: number) {
    const key = getAmapServiceKey();
    const fallback = { regeo: null, waterPoi: null, pois: [] };
    if (!key) return fallback;

    const [regeo, pois] = await Promise.all([
      this.fetchRegeo(key, lat, lng),
      this.fetchNearbyWaterPois(key, lat, lng, 1000),
    ]);
    const waterPoi = pois[0] || null;
    return { regeo, waterPoi, pois };
  }

  private async fetchRegeo(key: string, lat: number, lng: number) {
    try {
      const { data } = await axios.get('https://restapi.amap.com/v3/geocode/regeo', {
        timeout: 5000,
        params: {
          key,
          location: `${lng},${lat}`,
          radius: 1000,
          extensions: 'all',
        },
      });
      if (data?.status !== '1') return null;
      const regeocode = data.regeocode || {};
      const pois = Array.isArray(regeocode.pois) ? regeocode.pois : [];
      const firstWater = pois.find((poi: any) => isWaterPoi(poi.name, poi.type));
      return {
        address: regeocode.formatted_address || '',
        name: firstWater?.name || regeocode.addressComponent?.township || '',
        rawPois: pois,
      };
    } catch (error: any) {
      console.warn(`[AMap] 逆地理编码异常: ${error.message}`);
      return null;
    }
  }

  private async fetchNearbyWaterPois(key: string, lat: number, lng: number, radius: number) {
    const keywords = ['河流', '湖泊', '水库', '湿地', '江', '湖', '河', '溪', '塘'];
    const results: any[] = [];
    await Promise.all(keywords.map(async (keyword) => {
      try {
        const { data } = await axios.get('https://restapi.amap.com/v3/place/around', {
          timeout: 5000,
          params: {
            key,
            location: `${lng},${lat}`,
            keywords: keyword,
            radius,
            offset: 10,
            page: 1,
            extensions: 'base',
            sortrule: 'distance',
          },
        });
        if (data?.status === '1' && Array.isArray(data.pois)) {
          results.push(...data.pois);
        }
      } catch (error: any) {
        console.warn(`[AMap] 用户候选水域校验异常: ${error.message}`);
      }
    }));

    const deduped = new Map<string, any>();
    for (const poi of results) {
      const [poiLng, poiLat] = String(poi.location || '').split(',').map(Number);
      if (!poi.id || !poi.name || isNaN(poiLat) || isNaN(poiLng)) continue;
      if (!isWaterPoi(poi.name, poi.type)) continue;
      if (EXCLUDE_KEYWORDS.some((word) => `${poi.name} ${poi.type} ${poi.address || ''}`.includes(word))) continue;
      const distance = poi.distance ? Math.round(Number(poi.distance)) : Math.round(distanceMeters({ latitude: lat, longitude: lng }, { latitude: poiLat, longitude: poiLng }));
      if (!deduped.has(poi.id)) {
        deduped.set(poi.id, {
          id: poi.id,
          name: poi.name,
          address: poi.address || poi.pname || poi.cityname || '',
          latitude: poiLat,
          longitude: poiLng,
          distance,
          type: poi.type,
        });
      }
    }
    return Array.from(deduped.values()).sort((a, b) => a.distance - b.distance);
  }

  private async findDbCandidatesNearby(lat: number, lng: number, radius: number, limit: number) {
    const query = `
      SELECT
        id, name, address, latitude, longitude,
        fishTypes, fishCategories, evaluations,
        post_count AS postCount,
        source, source_poi_id AS sourcePoiId, status, confidence,
        ROUND(
          6371000 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(latitude)) * COS(RADIANS(?)) * COS(RADIANS(longitude) - RADIANS(?)) +
              SIN(RADIANS(latitude)) * SIN(RADIANS(?))
            ))
          )
        ) AS distance
      FROM fishing_spots
      WHERE status = 'candidate'
      HAVING distance <= ?
      ORDER BY distance ASC, confidence DESC
      LIMIT ?
    `;
    const rows = await this.spotRepo.query(query, [lat, lng, lat, Math.min(Math.max(radius, 500), 50000), Math.max(1, Math.min(limit, 50))]);
    return rows.map((row) => this.toCandidateResponse(row, Number(row.distance)));
  }

  private async searchDbCandidates(keyword: string, lat: number, lng: number, radius: number, limit: number) {
    const like = `%${keyword}%`;
    const query = `
      SELECT
        id, name, address, latitude, longitude,
        fishTypes, fishCategories, evaluations,
        post_count AS postCount,
        source, source_poi_id AS sourcePoiId, status, confidence,
        ROUND(
          6371000 * ACOS(
            LEAST(1, GREATEST(-1,
              COS(RADIANS(latitude)) * COS(RADIANS(?)) * COS(RADIANS(longitude) - RADIANS(?)) +
              SIN(RADIANS(latitude)) * SIN(RADIANS(?))
            ))
          )
        ) AS distance
      FROM fishing_spots
      WHERE status = 'candidate' AND (name LIKE ? OR address LIKE ?)
      HAVING distance <= ?
      ORDER BY distance ASC, confidence DESC
      LIMIT ?
    `;
    const rows = await this.spotRepo.query(query, [lat, lng, lat, like, like, Math.min(Math.max(radius, 500), 50000), Math.max(1, Math.min(limit, 50))]);
    return rows.map((row) => this.toCandidateResponse(row, Number(row.distance)));
  }

  private toCandidateResponse(spot: any, distance?: number) {
    return {
      id: spot.id,
      source: spot.source || 'user',
      sourcePoiId: spot.sourcePoiId || spot.source_poi_id || null,
      name: spot.name,
      address: spot.address || '',
      latitude: Number(spot.latitude),
      longitude: Number(spot.longitude),
      distance: distance != null && !isNaN(distance) ? Math.round(distance) : null,
      status: spot.status || 'candidate',
      confidence: Number(spot.confidence || 0),
      fishTypes: parseSimpleJson(spot.fishTypes || spot.fish_types) || [],
      fishCategories: parseSimpleJson(spot.fishCategories || spot.fish_categories) || [],
      evaluations: parseSimpleJson(spot.evaluations) || [],
      postCount: Number(spot.postCount ?? spot.post_count ?? 0),
      isCandidate: spot.status !== 'verified',
      savedSpotId: spot.id,
    };
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

function getAmapServiceKey() {
  return process.env.AMAP_WEB_SERVICE_KEY || process.env.AMAP_WEB_KEY || process.env.EXPO_PUBLIC_AMAP_WEB_KEY;
}

function scoreCandidateContext(context: { regeo: any; waterPoi: any; pois: any[] }) {
  const text = `${context.regeo?.address || ''} ${context.regeo?.name || ''} ${context.waterPoi?.name || ''} ${context.waterPoi?.type || ''}`;
  let confidence = 0.18;
  const reasons: string[] = [];

  if (context.waterPoi) {
    const distance = Number(context.waterPoi.distance ?? 999999);
    if (distance <= 100) {
      confidence += 0.58;
      reasons.push(`附近 ${distance}m 内识别到水域：${context.waterPoi.name}`);
    } else if (distance <= 300) {
      confidence += 0.46;
      reasons.push(`附近 ${distance}m 内有水域：${context.waterPoi.name}`);
    } else if (distance <= 800) {
      confidence += 0.3;
      reasons.push(`附近 ${distance}m 有疑似水域：${context.waterPoi.name}`);
    } else {
      confidence += 0.16;
      reasons.push(`附近有水域但距离较远：${context.waterPoi.name}`);
    }
  }

  if (isWaterPoi(text, '')) {
    confidence += 0.16;
    reasons.push('地址或附近 POI 含水域特征');
  }

  if (context.pois?.length >= 2) {
    confidence += 0.08;
    reasons.push('附近命中多个水域 POI');
  }

  if (EXCLUDE_KEYWORDS.some((word) => text.includes(word))) {
    confidence -= 0.35;
    reasons.push('附近存在明显非钓点场景');
  }

  confidence = Math.max(0, Math.min(0.95, Number(confidence.toFixed(2))));
  const allowed = confidence >= AUTO_APPROVE_CONFIDENCE;
  const reviewable = confidence >= REVIEW_CONFIDENCE;
  const reason = allowed
    ? reasons[0] || '附近水域特征明显'
    : reviewable
      ? '附近水域特征不够明确，将进入审核'
      : '附近未识别到可垂钓水域';

  return {
    allowed,
    reviewable,
    confidence,
    reason,
  };
}

function mergeCandidateResults(primary: any[], secondary: any[]) {
  const map = new Map<string, any>();
  [...primary, ...secondary].forEach((item) => {
    const key = item?.sourcePoiId || item?.source_poi_id || item?.id;
    if (!key) return;
    if (!map.has(String(key))) map.set(String(key), item);
  });
  return Array.from(map.values());
}

function normalizeSpotName(name?: string) {
  const safe = String(name || '').trim();
  if (!safe) return '未命名可探索点';
  return safe.length > 50 ? safe.slice(0, 50) : safe;
}

function parseSimpleJson(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
