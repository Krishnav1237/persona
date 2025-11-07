import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { EventType } from '@prisma/client';

class TrackEventDto {
  personaId: string;
  eventType: EventType;
  eventData: any;
  channel?: string;
  metadata?: any;
}

@ApiTags('analytics')
@Controller('analytics')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track an analytics event' })
  async trackEvent(@Body() dto: TrackEventDto) {
    return this.analyticsService.trackEvent(
      dto.personaId,
      dto.eventType,
      dto.eventData,
      dto.channel,
      dto.metadata,
    );
  }

  @Get('persona/:personaId')
  @ApiOperation({ summary: 'Get analytics for a persona' })
  async getAnalytics(
    @Param('personaId') personaId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getPersonaAnalytics(personaId, start, end);
  }

  @Get('persona/:personaId/timeseries')
  @ApiOperation({ summary: 'Get time series data for a persona' })
  async getTimeSeries(
    @Param('personaId') personaId: string,
    @Query('eventType') eventType?: EventType,
    @Query('interval') interval?: 'hour' | 'day' | 'week',
  ) {
    return this.analyticsService.getTimeSeries(personaId, eventType, interval || 'day');
  }
}
