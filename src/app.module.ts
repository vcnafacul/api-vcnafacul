import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { TypeOrmOptions } from './config/db.config';
import { SeederModule } from './db/seeds/seeder.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ContentModule } from './modules/contents/content/content.module';
import { FrenteModule } from './modules/contents/frente/frente.module';
import { SubjectModule } from './modules/contents/subject/subject.module';
import { GeoModule } from './modules/geo/geo.module';
import { NewsModule } from './modules/news/news.module';
import { PartnerPrepCourseModule } from './modules/prepCourse/partnerPrepCourse/partner-prep-course.module';
import { RoleModule } from './modules/role/role.module';
import { SimuladoModule } from './modules/simulado/simulado.module';
import { UserRoleModule } from './modules/user-role/user-role.module';
import { UserModule } from './modules/user/user.module';
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
    UserModule,
    RoleModule,
    UserRoleModule,
    GeoModule,
    AuditLogModule,
    SimuladoModule,
    NewsModule,
    FrenteModule,
    SubjectModule,
    ContentModule,
    PartnerPrepCourseModule,
    SeederModule,
  ],
  controllers: [AppController],
  providers: [JwtStrategy],
})
export class AppModule {}
