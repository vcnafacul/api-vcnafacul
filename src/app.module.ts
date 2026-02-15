import { HttpModule } from '@nestjs/axios';
import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { DatabaseHealthCheckService } from './config/db-health-check.service';
import { TypeOrmOptions } from './config/db.config';
import { SeederModule } from './db/seeds/seeder.module';
import { LokiLoggerService } from './logger/loki-logger';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { GeoModule } from './modules/geo/geo.module';
import { NewsModule } from './modules/news/news.module';
import { AbsenceJustificationModule } from './modules/prepCourse/attendance/absenceJustification/absence-justification.module';
import { AttendanceRecordModule } from './modules/prepCourse/attendance/attendanceRecord/attendance-record.module';
import { StudentAttendanceModule } from './modules/prepCourse/attendance/studentAttendance/student-attendance.module';
import { ClassModule } from './modules/prepCourse/class/class.module';
import { CollaboratorModule } from './modules/prepCourse/collaborator/collaborator.module';
import { CoursePeriodModule } from './modules/prepCourse/coursePeriod/course-period.module';
import { InscriptionCourseModule } from './modules/prepCourse/InscriptionCourse/inscription-course.module';
import { PartnerPrepCourseModule } from './modules/prepCourse/partnerPrepCourse/partner-prep-course.module';
import { StudentCourseModule } from './modules/prepCourse/studentCourse/student-course.module';
import { RoleModule } from './modules/role/role.module';
import { SimuladoModule } from './modules/simulado/simulado.module';
import { VcnafaculFormModule } from './modules/vcnafacul-form/vcnafacul-form.module';
import { THROTTLE_CONFIG } from './shared/config/email.config';
import { CacheManagerModule } from './shared/modules/cache/cache.module';
import { envSchema } from './shared/modules/env/env';
import { EnvModule } from './shared/modules/env/env.module';
import { BlobModule } from './shared/services/blob/blob.module';
import { DiscordWebhook } from './shared/services/webhooks/discord';
import { JwtStrategy } from './shared/strategy/jwt.strategy';

/**
 * Desabilita ThrottlerGuard em ambiente de teste para evitar erros 429
 * Em produção, o ThrottlerGuard é ativado para proteger contra abuso
 */
const isTestEnv = process.env.NODE_ENV === 'test';

const throttlerProvider: Provider = isTestEnv
  ? {
      provide: APP_GUARD,
      useValue: { canActivate: () => true },
    }
  : {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    };

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (env) => envSchema.parse(env),
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: THROTTLE_CONFIG.DEFAULT.ttl,
        limit: THROTTLE_CONFIG.DEFAULT.limit,
      },
    ]),
    EnvModule,
    TypeOrmModule.forRootAsync({
      imports: [EnvModule],
      useClass: TypeOrmOptions,
      inject: [TypeOrmOptions],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: process.env.APP_KEY,
      signOptions: { expiresIn: '15m' },
    }),
    HttpModule.registerAsync({
      useFactory: async () => ({
        timeout: 30000,
        maxRedirects: 3,
      }),
    }),
    ScheduleModule.forRoot(),
    RoleModule,
    GeoModule,
    PartnerPrepCourseModule,
    CollaboratorModule,
    CoursePeriodModule,
    AuditLogModule,
    NewsModule,
    StudentCourseModule,
    InscriptionCourseModule,
    SeederModule,
    BlobModule,
    SimuladoModule,
    ClassModule,
    AttendanceRecordModule,
    StudentAttendanceModule,
    AbsenceJustificationModule,
    CacheManagerModule,
    VcnafaculFormModule,
  ],
  controllers: [AppController],
  providers: [
    JwtStrategy,
    DiscordWebhook,
    LokiLoggerService,
    DatabaseHealthCheckService,
    throttlerProvider,
  ],
  exports: [DiscordWebhook],
})
export class AppModule {}
