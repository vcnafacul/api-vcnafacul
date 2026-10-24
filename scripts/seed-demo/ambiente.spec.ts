import { conferirTrava } from './ambiente';

const ok = {
  SEED_DEMO: '1',
  MY_HOST: 'localhost',
  MONGODB: 'mongodb://localhost:27018/form_demo?directConnection=true',
};

describe('conferirTrava', () => {
  it('aceita localhost e 127.0.0.1', () => {
    expect(() => conferirTrava(ok)).not.toThrow();
    expect(() =>
      conferirTrava({
        ...ok,
        MY_HOST: '127.0.0.1',
        MONGODB: 'mongodb://127.0.0.1:27018/x',
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

  it('recusa Mongo remoto, inclusive mongodb+srv', () => {
    expect(() =>
      conferirTrava({
        ...ok,
        MONGODB: 'mongodb+srv://u:p@vcnafacul.dbp1g3d.mongodb.net/form',
      }),
    ).toThrow(/MONGODB/);
  });
});
