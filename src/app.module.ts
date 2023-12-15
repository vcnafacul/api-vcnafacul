import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmOptions } from './config/db.config';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { UserRoleModule } from './modules/user-role/user-role.module';
import { SeederModule } from './db/seeds/seeder.module';
import { JwtModule } from '@nestjs/jwt';
import { GeoModule } from './modules/geo/geo.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './shared/strategy/jwt.strategy';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SimuladoModule } from './modules/simulado/simulado.module';
import { HttpModule } from '@nestjs/axios';
import { NewsModule } from './modules/news/news.module';

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
    SeederModule,
    GeoModule,
    AuditLogModule,
    SimuladoModule,
    NewsModule,
  ],
  controllers: [],
  providers: [JwtStrategy],
})
export class AppModule {}
