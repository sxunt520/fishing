import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('api/v1/search')
@ApiTags('搜索（旧版）')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('spots')
  @ApiOperation({ summary: '搜索钓点（旧版）', description: '按名称或地址搜索钓点，并根据分享热度和用户距离排序。首页当前使用新的 /spots/search 接口。' })
  @ApiQuery({ name: 'q', type: String, example: '府河', description: '搜索关键词' })
  @ApiQuery({ name: 'lat', type: Number, example: 30.5006, description: '用户纬度' })
  @ApiQuery({ name: 'lng', type: Number, example: 104.0725, description: '用户经度' })
  @ApiOkResponse({
    description: '搜索结果',
    schema: { example: [{ id: 'spot-uuid', name: '府河', address: '锦江区', latitude: 30.648034, longitude: 104.085385, distance: 1.52, post_count: 3 }] },
  })
  searchSpots(@Query('q') q: string, @Query('lat') lat: number, @Query('lng') lng: number) {
    return this.searchService.searchSpots(q, +lat, +lng);
  }
}
