import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { EnvService } from 'src/shared/modules/env/env.service';

@Injectable()
export class TypeOrmOptions implements TypeOrmOptionsFactory {
  constructor(private envService: EnvService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'mysql',
      host: this.envService.get('MY_HOST'),
      port: this.envService.get('MY_PORT'),
      username: this.envService.get('MY_USER'),
      password: this.envService.get('MY_PASSWORD'),
      database: this.envService.get('MY_DB_NAME'),
      entities: [__dirname + '/../**/*.entity.{js,ts}'],
      migrations: [__dirname + '/migrations/*.{js,ts}'],
      keepConnectionAlive: true,
      extra: {
        connectionLimit: 10,
        queueLimit: 0, // sem limite de fila
        waitForConnections: true, // aguarda conexão em vez de lançar erro
      },
    };
  }
}
