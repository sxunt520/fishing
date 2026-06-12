import { Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { SpotService } from './spot.service';
import { CreateSpotDto } from './dto/spot.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';

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
