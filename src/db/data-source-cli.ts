import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const dataSourceOptions: DataSourceOptions = {
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

console.log({ dataSourceOptions });

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
