import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PersonaModule } from './modules/persona/persona.module';
import { ChatModule } from './modules/chat/chat.module';
import { DeploymentModule } from './modules/deployment/deployment.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DatabaseModule } from './modules/database/database.module';
import { AIModule } from './modules/ai/ai.module';
import { VectorModule } from './modules/vector/vector.module';
import { CacheModule } from './modules/cache/cache.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Core Infrastructure
    DatabaseModule,
    CacheModule,
    VectorModule,

    // AI & Intelligence
    AIModule,

    // Feature Modules
    AuthModule,
    PersonaModule,
    ChatModule,
    DeploymentModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
