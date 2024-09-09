import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmOptions implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: this.configService.get<string>('MY_HOST'),
      port: this.configService.get<number>('MY_PORT'),
      username: this.configService.get<string>('MY_USER'),
      password: this.configService.get<string>('MY_PASSWORD'),
      database: this.configService.get<string>('MY_DB_NAME'),
      entities: [__dirname + '/../**/*.entity.{js,ts}'],
      migrations: [__dirname + '/migrations/*.{js,ts}'],
    };
  }
}
