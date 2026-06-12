import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtGuard)
  get(@CurrentUser() user: any, @Query('page') page: number = 1) {
    return this.notificationService.getNotifications(user.userId, +page);
  }
}
