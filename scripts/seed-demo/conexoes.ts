import { MongoClient, Db } from 'mongodb';
import { DataSource } from 'typeorm';

export interface Conexoes {
  ds: DataSource;
  mongo: MongoClient;
  form: Db;
}

export async function abrirConexoes(): Promise<Conexoes> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.MY_HOST,
    port: Number(process.env.MY_PORT),
    username: process.env.MY_USER,
    password: process.env.MY_PASSWORD,
    database: process.env.MY_DB_NAME,
    entities: [__dirname + '/../../src/**/*.entity.{js,ts}'],
    synchronize: false,
    timezone: 'Z',
  });
  await ds.initialize();
  const mongo = await new MongoClient(process.env.MONGODB!).connect();
  return { ds, mongo, form: mongo.db() };
}

export async function fecharConexoes(c: Conexoes) {
  await c.ds.destroy();
  await c.mongo.close();
}
