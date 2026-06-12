import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('spots')
  searchSpots(@Query('q') q: string, @Query('lat') lat: number, @Query('lng') lng: number) {
    return this.searchService.searchSpots(q, +lat, +lng);
  }
}
