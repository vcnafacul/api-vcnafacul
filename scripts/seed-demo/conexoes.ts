import { MongoClient, Db } from 'mongodb';
import { DataSource } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

export interface Conexoes {
  ds: DataSource;
  mongo: MongoClient;
  form: Db;
}

const opcoesMysql = (): MysqlConnectionOptions => ({
  type: 'mysql',
  host: process.env.MY_HOST,
  port: Number(process.env.MY_PORT),
  username: process.env.MY_USER,
  password: process.env.MY_PASSWORD,
  database: process.env.MY_DB_NAME,
  entities: [__dirname + '/../../src/**/*.entity.{js,ts}'],
  synchronize: false,
});

/**
 * A conexão das etapas é `timezone: 'Z'`: as partes UTC de um `Date` viram o
 * texto gravado (e lido) no banco, sem depender do fuso da máquina.
 */
export async function abrirConexoes(): Promise<Conexoes> {
  const ds = new DataSource({ ...opcoesMysql(), timezone: 'Z' });
  await ds.initialize();
  const mongo = await new MongoClient(process.env.MONGODB!).connect();
  return { ds, mongo, form: mongo.db() };
}

/**
 * Conexão igual à da api (`src/config/db.config.ts`: sem `timezone`, então o
 * mysql2 usa o fuso do processo, TZ=America/Sao_Paulo). O 07 calcula os
 * indicadores com ela, como o cron dentro da api: o `fimDoDia` vira o texto
 * `AAAA-MM-DD 23:59:59` de SP, e não `…+1 02:59:59` como na conexão `Z`.
 */
export async function abrirConexaoComoAApi(): Promise<DataSource> {
  if (process.env.TZ !== 'America/Sao_Paulo')
    throw new Error(
      `TZ=${process.env.TZ}: o seed demo precisa de TZ=America/Sao_Paulo (como a api no demo).`,
    );
  const ds = new DataSource(opcoesMysql());
  return ds.initialize();
}

export async function fecharConexoes(c: Conexoes) {
  await c.ds.destroy();
  await c.mongo.close();
}
