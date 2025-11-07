import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async trackEvent(
    personaId: string,
    eventType: EventType,
    eventData: any,
    channel?: string,
    metadata?: any,
  ) {
    return this.prisma.analyticsEvent.create({
      data: {
        personaId,
        eventType,
        eventData,
        channel: channel as any,
        metadata: metadata || {},
      },
    });
  }

  async getPersonaAnalytics(personaId: string, startDate?: Date, endDate?: Date) {
    const where: any = { personaId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [
      totalEvents,
      eventsByType,
      eventsByChannel,
      messageCount,
      conversationCount,
    ] = await Promise.all([
      this.prisma.analyticsEvent.count({ where }),
      this.prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where,
        _count: true,
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['channel'],
        where: { ...where, channel: { not: null } },
        _count: true,
      }),
      this.prisma.message.count({
        where: { personaId },
      }),
      this.prisma.conversation.count({
        where: { personaId },
      }),
    ]);

    return {
      personaId,
      period: {
        start: startDate || null,
        end: endDate || null,
      },
      summary: {
        totalEvents,
        totalMessages: messageCount,
        totalConversations: conversationCount,
      },
      eventsByType: eventsByType.reduce((acc: any, item: any) => {
        acc[item.eventType] = item._count;
        return acc;
      }, {}),
      eventsByChannel: eventsByChannel.reduce((acc: any, item: any) => {
        acc[item.channel || 'unknown'] = item._count;
        return acc;
      }, {}),
    };
  }

  async getTimeSeries(
    personaId: string,
    eventType?: EventType,
    interval: 'hour' | 'day' | 'week' = 'day',
  ) {
    // Simplified time series - in production would use SQL window functions
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        personaId,
        ...(eventType && { eventType }),
      },
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });

    // Group by interval
    const grouped = new Map<string, number>();

    events.forEach((event) => {
      const key = this.getIntervalKey(event.timestamp, interval);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([timestamp, count]) => ({
      timestamp,
      count,
    }));
  }

  private getIntervalKey(date: Date, interval: 'hour' | 'day' | 'week'): string {
    const d = new Date(date);

    switch (interval) {
      case 'hour':
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:00`;
      case 'day':
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      case 'week':
        const week = Math.floor(d.getDate() / 7);
        return `${d.getFullYear()}-${d.getMonth() + 1}-W${week}`;
      default:
        return d.toISOString();
    }
  }
}
