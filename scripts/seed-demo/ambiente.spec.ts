import { conferirTrava } from './ambiente';

const ok = {
  SEED_DEMO: '1',
  MY_HOST: 'localhost',
  MY_PORT: '3308',
  MY_DB_NAME: 'vcnafacul_demo',
  MONGODB: 'mongodb://localhost:27018/form_demo?directConnection=true',
};

describe('conferirTrava', () => {
  it('aceita localhost e 127.0.0.1', () => {
    expect(() => conferirTrava(ok)).not.toThrow();
    expect(() =>
      conferirTrava({
        ...ok,
        MY_HOST: '127.0.0.1',
        MONGODB: 'mongodb://127.0.0.1:27018/form_demo',
      }),
    ).not.toThrow();
  });

  it('recusa sem SEED_DEMO=1', () => {
    expect(() => conferirTrava({ ...ok, SEED_DEMO: undefined })).toThrow(
      /SEED_DEMO/,
    );
  });

  it('recusa MySQL remoto', () => {
    expect(() =>
      conferirTrava({ ...ok, MY_HOST: 'srv1.hostinger.com' }),
    ).toThrow(/MY_HOST/);
  });

  it('recusa banco MySQL que não é o do demo', () => {
    expect(() => conferirTrava({ ...ok, MY_DB_NAME: 'vcnafacul' })).toThrow(
      /MY_DB_NAME/,
    );
    expect(() => conferirTrava({ ...ok, MY_DB_NAME: undefined })).toThrow(
      /MY_DB_NAME/,
    );
  });

  it('recusa porta MySQL que não é a do container do demo', () => {
    expect(() => conferirTrava({ ...ok, MY_PORT: '3306' })).toThrow(/MY_PORT/);
    expect(() => conferirTrava({ ...ok, MY_PORT: '3307' })).toThrow(/MY_PORT/);
  });

  it('recusa Mongo remoto, inclusive mongodb+srv', () => {
    expect(() =>
      conferirTrava({
        ...ok,
        MONGODB: 'mongodb+srv://u:p@vcnafacul.dbp1g3d.mongodb.net/form',
      }),
    ).toThrow(/MONGODB/);
  });

  it('recusa Mongo local em outra porta', () => {
    expect(() =>
      conferirTrava({ ...ok, MONGODB: 'mongodb://localhost:27017/form_demo' }),
    ).toThrow(/27018/);
    expect(() =>
      conferirTrava({ ...ok, MONGODB: 'mongodb://localhost/form_demo' }),
    ).toThrow(/27018/);
  });

  it('recusa Mongo local com outro banco', () => {
    expect(() =>
      conferirTrava({ ...ok, MONGODB: 'mongodb://localhost:27018/form' }),
    ).toThrow(/form_demo/);
    expect(() =>
      conferirTrava({ ...ok, MONGODB: 'mongodb://localhost:27018' }),
    ).toThrow(/form_demo/);
  });
});
