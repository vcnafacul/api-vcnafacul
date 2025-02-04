import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

// const dataSourceOptions: DataSourceOptions = {
//   type: 'postgres',
//   host: process.env.PG_HOST,
//   port: Number(process.env.PG_PORT),
//   username: process.env.PG_USER,
//   password: process.env.PG_PASSWORD,
//   database: process.env.PG_DB_NAME,
//   entities: [__dirname + '/../**/*.entity.{js,ts}'],
//   migrations: [__dirname + '/migrations/pg/*.{js,ts}'],
// };

const options: DataSourceOptions = {
  type: 'mysql',
  host: process.env.MY_HOST,
  port: Number(process.env.MY_PORT),
  username: process.env.MY_USER,
  password: process.env.MY_PASSWORD,
  database: process.env.MY_DB_NAME,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
  synchronize: true,
  timezone: 'Z',
  extra: {
    connectionLimit: 10,
  },
};

console.log({ databaseConnection: options });

export default new DataSource(options);
