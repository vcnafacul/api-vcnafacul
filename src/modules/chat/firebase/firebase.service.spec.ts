import { ServiceUnavailableException } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { FirebaseService } from './firebase.service';

// Mocka o firebase-admin: o teste valida o SHAPE da inicialização
// (env vars decodificadas, certificado passado para initializeApp).
// O Admin SDK real rejeita PEMs inválidos via parsing criptográfico,
// então mockamos `cert` e `initializeApp` para evitar acoplamento.
jest.mock('firebase-admin', () => {
  const fakeAuth = { name: 'auth' };
  const fakeFirestore = { name: 'firestore' };
  const fakeApp = {
    auth: jest.fn().mockReturnValue(fakeAuth),
    firestore: jest.fn().mockReturnValue(fakeFirestore),
  };
  return {
    apps: [],
    initializeApp: jest.fn().mockReturnValue(fakeApp),
    credential: {
      cert: jest.fn().mockReturnValue({ kind: 'cert' }),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

const fakeSAJson = {
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'fake',
  private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  client_email: 'fake@test.iam.gserviceaccount.com',
  client_id: '1',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};
const fakeSA = Buffer.from(JSON.stringify(fakeSAJson)).toString('base64');

const buildEnv = (overrides: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_SERVICE_ACCOUNT_BASE64: fakeSA,
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as EnvService;
};

describe('FirebaseService', () => {
  beforeEach(() => {
    admin.apps.length = 0;
    jest.clearAllMocks();
  });

  it('inicializa Admin SDK passando credential e projectId derivados das env vars', () => {
    const service = new FirebaseService(buildEnv());
    service.onModuleInit();

    expect(admin.credential.cert).toHaveBeenCalledWith(fakeSAJson);
    expect(admin.initializeApp).toHaveBeenCalledWith({
      credential: { kind: 'cert' },
      projectId: 'test-project',
    });
  });

  it('expõe auth() e firestore() do app inicializado', () => {
    const service = new FirebaseService(buildEnv());
    service.onModuleInit();

    expect(service.auth()).toBeDefined();
    expect(service.firestore()).toBeDefined();
  });

  it('reusa app existente em admin.apps em vez de inicializar de novo', () => {
    const existing = {
      auth: jest.fn().mockReturnValue('a'),
      firestore: jest.fn().mockReturnValue('f'),
    };
    admin.apps.push(existing);

    const service = new FirebaseService(buildEnv());
    service.onModuleInit();

    expect(admin.initializeApp).not.toHaveBeenCalled();
    expect(service.auth()).toBe('a');
  });

  it('faz no-op (sem throw) quando env vars Firebase ausentes', () => {
    const service = new FirebaseService(
      buildEnv({
        FIREBASE_PROJECT_ID: '',
        FIREBASE_SERVICE_ACCOUNT_BASE64: '',
      }),
    );
    expect(() => service.onModuleInit()).not.toThrow();
    expect(admin.initializeApp).not.toHaveBeenCalled();
  });

  it('auth() lança ServiceUnavailableException quando Firebase não inicializado', () => {
    const service = new FirebaseService(
      buildEnv({
        FIREBASE_PROJECT_ID: '',
        FIREBASE_SERVICE_ACCOUNT_BASE64: '',
      }),
    );
    service.onModuleInit();

    expect(() => service.auth()).toThrow(ServiceUnavailableException);
  });

  it('firestore() lança ServiceUnavailableException quando Firebase não inicializado', () => {
    const service = new FirebaseService(
      buildEnv({
        FIREBASE_PROJECT_ID: '',
        FIREBASE_SERVICE_ACCOUNT_BASE64: '',
      }),
    );
    service.onModuleInit();

    expect(() => service.firestore()).toThrow(ServiceUnavailableException);
  });
});
