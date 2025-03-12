import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { TypeOrmOptions } from './config/db.config';
import { SeederModule } from './db/seeds/seeder.module';
import { LokiLoggerService } from './logger/loki-logger';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ContentModule } from './modules/contents/content/content.module';
import { FrenteModule } from './modules/contents/frente/frente.module';
import { SubjectModule } from './modules/contents/subject/subject.module';
import { GeoModule } from './modules/geo/geo.module';
import { NewsModule } from './modules/news/news.module';
import { AbsenceJustificationModule } from './modules/prepCourse/attendance/absenceJustification/absence-justification.module';
import { AttendanceRecordModule } from './modules/prepCourse/attendance/attendanceRecord/attendance-record.module';
import { StudentAttendanceModule } from './modules/prepCourse/attendance/studentAttendance/student-attendance.module';
import { ClassModule } from './modules/prepCourse/class/class.module';
import { CollaboratorModule } from './modules/prepCourse/collaborator/collaborator.module';
import { InscriptionCourseModule } from './modules/prepCourse/InscriptionCourse/inscription-course.module';
import { PartnerPrepCourseModule } from './modules/prepCourse/partnerPrepCourse/partner-prep-course.module';
import { StudentCourseModule } from './modules/prepCourse/studentCourse/student-course.module';
import { RoleModule } from './modules/role/role.module';
import { SimuladoModule } from './modules/simulado/simulado.module';
import { BlobModule } from './shared/services/blob/blob.module';
import { DiscordWebhook } from './shared/services/webhooks/discord';
import { JwtStrategy } from './shared/strategy/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmOptions,
      inject: [TypeOrmOptions],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: process.env.APP_KEY,
      signOptions: { expiresIn: '7d' },
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
    AuditLogModule,
    SimuladoModule,
    NewsModule,
    FrenteModule,
    SubjectModule,
    ContentModule,
    StudentCourseModule,
    InscriptionCourseModule,
    SeederModule,
    BlobModule,
    ClassModule,
    AttendanceRecordModule,
    StudentAttendanceModule,
    AbsenceJustificationModule,
  ],
  controllers: [AppController],
  providers: [JwtStrategy, DiscordWebhook, LokiLoggerService],
  exports: [DiscordWebhook],
})
export class AppModule {}
