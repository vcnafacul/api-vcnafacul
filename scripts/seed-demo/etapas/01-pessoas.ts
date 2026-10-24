import { Role } from '../../../src/modules/role/role.entity';
import { Gender } from '../../../src/modules/user/enum/gender';
import { User } from '../../../src/modules/user/user.entity';
import { REPRESENTANTE } from '../config';
import { Contexto } from '../contexto';

/**
 * O usuário do Fernando (representante). Roles com `partnerPrepCourse` só
 * existem depois do `02`: aqui ele nasce como aluno e a `02` troca a role.
 */
export async function executar(ctx: Contexto) {
  const senha = process.env.SEED_DEMO_SENHA;
  if (!senha) throw new Error('SEED_DEMO_SENHA ausente no .env.seed-demo.');
  const users = ctx.ds.getRepository(User);
  const aluno = await ctx.ds
    .getRepository(Role)
    .findOneByOrFail({ name: 'aluno' });

  const u = new User();
  Object.assign(u, {
    email: REPRESENTANTE.email,
    // texto puro: o @BeforeInsert gera o hash (hash aqui = hash duplo, login falha)
    password: senha,
    firstName: REPRESENTANTE.firstName,
    lastName: REPRESENTANTE.lastName,
    phone: REPRESENTANTE.phone,
    birthday: new Date(REPRESENTANTE.birthday),
    state: REPRESENTANTE.state,
    city: REPRESENTANTE.city,
    gender: Gender.Male,
    lgpd: true,
    emailConfirmSended: null, // default now() bloqueia o login por 2h
    role: aluno, // trocado pela role do cursinho na etapa 02
  });
  ctx.representanteUserId = (await users.save(u)).id;
  console.log(`01 pessoas: ${REPRESENTANTE.email} criado`);
}
