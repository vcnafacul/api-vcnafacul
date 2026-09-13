import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { getDataSourceToken, getEntityManagerToken } from '@nestjs/typeorm';
import { SimuladoModule } from '../simulado.module';
import { CadernoLogosService } from './caderno-logos.service';

// ⚠️ Este teste existe porque os testes unitários instanciam as classes com
// `new` e nunca passam pelo container — então nada neles pega um token de
// injeção errado nem uma dependência circular. As duas coisas só aparecem no
// boot, e o boot só acontece em produção.
//
// O `EntityManager` e o `ConfigModule` vêm do `AppModule` em produção (TypeORM
// e ConfigModule globais). Aqui entram dublês: o que está sob teste é a fiação
// do módulo, não o banco.
//
// Se este teste quebrar, leia a mensagem antes de mexer no caderno:
//   "Invalid BLOB_PROVIDER"  → `.env.example` perdeu `BLOB_PROVIDER=S3`.
//   "can't resolve <algo>"   → módulo novo na árvore pede um global que o
//                              AppModule dá e os dublês daqui não.
// O `validate` do zod fica FORA de propósito: amarrar a fiação ao schema de
// env faria este teste falhar por motivo alheio.
@Global()
@Module({
  providers: [
    {
      provide: getEntityManagerToken(),
      useValue: { getRepository: () => ({}) },
    },
    {
      provide: getDataSourceToken(),
      useValue: { getRepository: () => ({}) },
    },
  ],
  exports: [getEntityManagerToken(), getDataSourceToken()],
})
class FakeTypeOrmModule {}

describe('SimuladoModule — fiação do caderno', () => {
  it('monta e resolve o CadernoLogosService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.example' }),
        JwtModule.register({ global: true, secret: 'test' }),
        FakeTypeOrmModule,
        SimuladoModule,
      ],
    }).compile();

    expect(moduleRef.get(CadernoLogosService)).toBeDefined();
    await moduleRef.close();
  });
});
