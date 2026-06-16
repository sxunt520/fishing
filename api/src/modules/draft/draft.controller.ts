import { Controller, Get, Post, Body, Delete, UseGuards } from '@nestjs/common';
import { DraftService } from './draft.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/drafts')
export class DraftController {
  constructor(private readonly draftService: DraftService) {}

  @Get()
  @UseGuards(JwtGuard)
  getDraft(@CurrentUser() user: any) {
    return this.draftService.getDraft(user.userId);
  }

  @Post()
  @UseGuards(JwtGuard)
  saveDraft(@Body() dto: any, @CurrentUser() user: any) {
    return this.draftService.saveDraft(user.userId, dto);
  }

  @Delete()
  @UseGuards(JwtGuard)
  clearDraft(@CurrentUser() user: any) {
    return this.draftService.clearDraft(user.userId);
  }
}
