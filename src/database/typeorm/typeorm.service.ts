import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { resolve } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { EnvService } from 'src/shared/modules/env/env.service';

// @Injectable()
export class TypeormService
  extends DataSource
  implements OnModuleInit, OnModuleDestroy
{
  constructor(env: EnvService) {
    const dataSourceOptions: DataSourceOptions = {
      type: 'mysql',
      host: env.get('MY_HOST'),
      port: env.get('MY_PORT'),
      username: env.get('MY_USER'),
      password: env.get('MY_PASSWORD'),
      database: env.get('MY_DB_NAME'),
      entities: [resolve(__dirname, '..', '**', '*.entity.{js,ts}')],
      migrations: [resolve(__dirname + 'migrations', '*.{js,ts}')],
      synchronize: true,
      timezone: 'Z',
      extra: { connectionLimit: 10 },
    };

    console.log({ dataSourceOptions });

    super(dataSourceOptions);
  }

  async onModuleInit() {
    try {
      await this.initialize();
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
        process.exit(1);
      }
    }
  }

  async onModuleDestroy() {
    await this.destroy();
  }
}
