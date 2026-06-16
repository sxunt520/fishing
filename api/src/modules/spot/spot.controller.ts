import { Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { SpotService } from './spot.service';
import { CreateSpotDto, UserCandidateDto } from './dto/spot.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/spots')
export class SpotController {
  constructor(private readonly spotService: SpotService) {}

  @Get()
  findInBounds(
    @Query('north') north: number,
    @Query('south') south: number,
    @Query('east') east: number,
    @Query('west') west: number,
  ) {
    return this.spotService.findInBounds(+north, +south, +east, +west);
  }

  @Get('nearby')
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
  createUserCandidate(@Body() dto: UserCandidateDto, @CurrentUser() user: any) {
    return this.spotService.createUserCandidate(dto, user.userId);
  }

  @Get('ip-location')
  findIpLocation() {
    return this.spotService.findIpLocation();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('lat') lat?: number, @Query('lng') lng?: number) {
    return this.spotService.findOne(id, lat != null ? +lat : undefined, lng != null ? +lng : undefined);
  }

  @Post()
  @UseGuards(JwtGuard)
  create(@Body() dto: CreateSpotDto) {
    return this.spotService.create(dto);
  }
}
