import { Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { SpotService } from './spot.service';
import { CreateSpotDto, UserCandidateDto } from './dto/spot.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('api/v1/spots')
@ApiTags('钓点')
export class SpotController {
  constructor(private readonly spotService: SpotService) {}

  @Get()
  @ApiOperation({ summary: '获取地图范围内真实钓点', description: '根据地图可视区域的四个边界查询 verified 真实钓点，按分享数量倒序排列。' })
  @ApiQuery({ name: 'north', type: Number, example: 30.55, description: '北边界纬度' })
  @ApiQuery({ name: 'south', type: Number, example: 30.45, description: '南边界纬度' })
  @ApiQuery({ name: 'east', type: Number, example: 104.12, description: '东边界经度' })
  @ApiQuery({ name: 'west', type: Number, example: 104.02, description: '西边界经度' })
  @ApiOkResponse({
    description: '地图范围内真实钓点',
    schema: { example: [{ id: 'spot-uuid', name: '府河', address: '锦江区', latitude: 30.5006, longitude: 104.0725, fishTypes: ['鲫鱼'], fishCategories: ['鲫鱼'], evaluations: ['野钓'], postCount: 3, source: 'amap', status: 'verified', confidence: 0.75 }] },
  })
  findInBounds(
    @Query('north') north: number,
    @Query('south') south: number,
    @Query('east') east: number,
    @Query('west') west: number,
  ) {
    return this.spotService.findInBounds(+north, +south, +east, +west);
  }

  @Get('nearby')
  @ApiOperation({ summary: '获取附近热门钓点', description: '按用户位置查询指定公里范围内的 verified 真实钓点，优先按距离、其次按分享数量排序。' })
  @ApiQuery({ name: 'lat', type: Number, example: 30.5006, description: '用户纬度' })
  @ApiQuery({ name: 'lng', type: Number, example: 104.0725, description: '用户经度' })
  @ApiQuery({ name: 'radius', required: false, type: Number, example: 5, description: '搜索半径，单位公里，默认 10' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: '返回数量，默认 20' })
  @ApiOkResponse({
    description: '附近真实钓点，distance 单位为公里',
    schema: { example: [{ id: 'spot-uuid', name: '府河', address: '锦江区', latitude: 30.5006, longitude: 104.0725, fishTypes: ['鲫鱼'], postCount: 3, distance: 1.25 }] },
  })
  @ApiBadRequestResponse({ description: 'lat 或 lng 缺失或不是数字' })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string = '10',
    @Query('limit') limit: string = '20',
  ) {
    //return this.spotService.findNearby(+lat, +lng, +radius, +limit);

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radius);
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('lat 和 lng 是必需的且必须为数字');
    }
    return this.spotService.findNearby(parsedLat, parsedLng, parsedRadius, parsedLimit);

  }

  @Get('water-candidates')
  @ApiOperation({ summary: '获取附近候选水域', description: '合并数据库候选点与高德周边 POI 水域，按 sourcePoiId 去重并按距离排序。' })
  @ApiQuery({ name: 'lat', type: Number, example: 30.5006, description: '地图中心纬度' })
  @ApiQuery({ name: 'lng', type: Number, example: 104.0725, description: '地图中心经度' })
  @ApiQuery({ name: 'radius', required: false, type: Number, example: 5000, description: '搜索半径，单位米，范围 500-50000' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30, description: '返回数量，最大 50' })
  @ApiOkResponse({
    description: '候选水域列表，distance 单位为米',
    schema: { example: [{ id: 'amap_B0FFGFBM48', source: 'amap', sourcePoiId: 'B0FFGFBM48', name: '府河', address: '锦江区', latitude: 30.648034, longitude: 104.085385, distance: 1526, type: '地名地址信息;自然地名;河流', status: 'candidate', confidence: 0.45, isCandidate: true }] },
  })
  @ApiBadRequestResponse({ description: '经纬度无效' })
  findWaterCandidates(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string = '5000',
    @Query('limit') limit: string = '30',
  ) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radius);
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('lat 和 lng 是必需的且必须为数字');
    }
    return this.spotService.findWaterCandidates(parsedLat, parsedLng, parsedRadius, parsedLimit);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索真实钓点', description: '按名称或地址搜索 verified 真实钓点；传入用户坐标时按距离和分享热度排序。' })
  @ApiQuery({ name: 'keyword', type: String, example: '府河', description: '钓点名称或地址关键词' })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 30.5006, description: '用户纬度' })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 104.0725, description: '用户经度' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: '返回数量，最大 50' })
  @ApiOkResponse({
    description: '真实钓点搜索结果',
    schema: { example: [{ id: 'spot-uuid', name: '府河', address: '锦江区', latitude: 30.648034, longitude: 104.085385, fishTypes: ['鲫鱼'], postCount: 3, status: 'verified', distance: 1.52 }] },
  })
  @ApiBadRequestResponse({ description: 'keyword 为空' })
  searchSpots(
    @Query('keyword') keyword: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit: string = '20',
  ) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('keyword 是必需的');
    }
    const parsedLat = lat != null ? parseFloat(lat) : undefined;
    const parsedLng = lng != null ? parseFloat(lng) : undefined;
    const parsedLimit = parseInt(limit, 10);
    return this.spotService.searchSpots(keyword, parsedLat, parsedLng, parsedLimit);
  }

  @Get('water-search')
  @ApiOperation({ summary: '按关键词搜索候选水域', description: '用户主动点击“搜索更多附近水域”时调用，合并数据库候选点和高德 POI，搜索结果不会直接入库。' })
  @ApiQuery({ name: 'keyword', type: String, example: '锦江', description: '水域关键词' })
  @ApiQuery({ name: 'lat', type: Number, example: 30.5006, description: '搜索中心纬度' })
  @ApiQuery({ name: 'lng', type: Number, example: 104.0725, description: '搜索中心经度' })
  @ApiQuery({ name: 'radius', required: false, type: Number, example: 10000, description: '搜索半径，单位米' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: '返回数量，最大 50' })
  @ApiOkResponse({
    description: '候选水域关键词搜索结果',
    schema: { example: [{ id: 'amap_B0FFGFBM48', source: 'amap', sourcePoiId: 'B0FFGFBM48', name: '锦江', address: '成华区', latitude: 30.669603, longitude: 104.09078, distance: 1599, status: 'candidate', confidence: 0.45, isCandidate: true }] },
  })
  @ApiBadRequestResponse({ description: '关键词或经纬度无效' })
  searchWaterCandidates(
    @Query('keyword') keyword: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string = '10000',
    @Query('limit') limit: string = '20',
  ) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('keyword 是必需的');
    }
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radius);
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('lat 和 lng 是必需的且必须为数字');
    }
    return this.spotService.searchWaterCandidates(keyword, parsedLat, parsedLng, parsedRadius, parsedLimit);
  }

  @Get('user-candidates/validate')
  @ApiOperation({ summary: '校验地图长按位置', description: '校验长按位置附近是否已有钓点，并结合高德逆地理编码和水域 POI 计算候选点置信度。' })
  @ApiQuery({ name: 'lat', type: Number, example: 30.5006, description: '长按位置纬度' })
  @ApiQuery({ name: 'lng', type: Number, example: 104.0725, description: '长按位置经度' })
  @ApiOkResponse({
    description: '位置校验结果',
    schema: {
      example: {
        allowed: true,
        reviewable: true,
        confidence: 0.76,
        reason: '附近 80m 内识别到水域：府河',
        latitude: 30.5006,
        longitude: 104.0725,
        suggestedName: '府河',
        address: '四川省成都市双流区',
        nearestWater: { name: '府河', distance: 80 },
      },
    },
  })
  @ApiBadRequestResponse({ description: '经纬度无效' })
  validateUserCandidate(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('lat 和 lng 是必需的且必须为数字');
    }
    return this.spotService.validateUserCandidate(parsedLat, parsedLng);
  }

  @Post('user-candidates')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '提交用户候选钓点', description: '用户确认长按位置后创建候选钓点；高置信度自动通过，普通置信度进入审核，低置信度拒绝。' })
  @ApiCreatedResponse({
    description: '创建候选点或返回附近已有点',
    schema: { example: { id: 'candidate-uuid', source: 'user', sourcePoiId: null, name: '府河桥下钓位', address: '四川省成都市双流区', latitude: 30.5006, longitude: 104.0725, status: 'candidate', confidence: 0.76, fishTypes: [], fishCategories: [], evaluations: [], postCount: 0, isCandidate: true, savedSpotId: 'candidate-uuid', message: '已新增为可探索钓点', autoApproved: true } },
  })
  @ApiBadRequestResponse({ description: '位置不是水域、提交过于频繁或当日次数达到上限' })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  createUserCandidate(@Body() dto: UserCandidateDto, @CurrentUser() user: any) {
    return this.spotService.createUserCandidate(dto, user.userId);
  }

  @Get('ip-location')
  @ApiOperation({ summary: '通过 IP 获取城市定位', description: '使用高德 IP 定位作为设备定位失败时的城市级兜底；不是精确 GPS 定位。' })
  @ApiOkResponse({
    description: '城市中心坐标；定位失败时返回 null',
    schema: { example: { latitude: 30.660239605, longitude: 104.07811045, province: '四川省', city: '成都市', adcode: '510100', source: 'amap-ip' } },
  })
  findIpLocation() {
    return this.spotService.findIpLocation();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取钓点详情', description: '获取指定钓点完整资料；传入用户坐标时额外计算直线距离，单位公里。' })
  @ApiParam({ name: 'id', description: '真实钓点 UUID', example: '65333cd9-f988-49b5-a460-a01b646ce48e' })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 30.5006, description: '用户纬度' })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 104.0725, description: '用户经度' })
  @ApiOkResponse({
    description: '钓点详情',
    schema: { example: { id: 'spot-uuid', name: '府河', address: '锦江区', latitude: 30.648034, longitude: 104.085385, fishTypes: ['鲫鱼'], fishCategories: ['鲫鱼'], evaluations: ['野钓'], postCount: 3, source: 'amap', sourcePoiId: 'B0FFGFBM48', status: 'verified', confidence: 0.75, distance: 1.52 } },
  })
  @ApiNotFoundResponse({ description: '钓点不存在' })
  findOne(@Param('id') id: string, @Query('lat') lat?: number, @Query('lng') lng?: number) {
    return this.spotService.findOne(id, lat != null ? +lat : undefined, lng != null ? +lng : undefined);
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '直接创建真实钓点', description: '直接创建 verified 真实钓点。当前版本尚未限制管理员角色。' })
  @ApiCreatedResponse({
    description: '真实钓点创建成功',
    schema: { example: { id: 'spot-uuid', name: '明湖', address: '北京市海淀区', latitude: 39.9042, longitude: 116.4074, fishTypes: ['鲫鱼', '草鱼'], fishCategories: null, evaluations: null, postCount: 0, source: 'user', status: 'verified', confidence: 0.8, createdAt: '2026-06-18T08:00:00.000Z' } },
  })
  @ApiBadRequestResponse({ description: '请求参数校验失败' })
  @ApiUnauthorizedResponse({ description: '未登录或 Token 已过期' })
  create(@Body() dto: CreateSpotDto) {
    return this.spotService.create(dto);
  }
}
