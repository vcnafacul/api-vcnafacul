import { Geolocation } from '../../../src/modules/geo/geo.entity';
import { Collaborator } from '../../../src/modules/prepCourse/collaborator/collaborator.entity';
import { PartnerPrepCourse } from '../../../src/modules/prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { PERMISSION_FIELD_MAP } from '../../../src/modules/role/permissions/permission-field-map';
import {
  PERMISSION_HIERARCHY,
  PermissionType,
} from '../../../src/modules/role/permissions/permission-hierarchy';
import { Role } from '../../../src/modules/role/role.entity';
import { Status } from '../../../src/modules/simulado/enum/status.enum';
import { Gender } from '../../../src/modules/user/enum/gender';
import { User } from '../../../src/modules/user/user.entity';
import { faker } from '../aleatorio';
import { inicioDoDia } from '../calendario';
import {
  COLABORADORES,
  CURSINHO,
  DOMINIO_DEMO,
  REPRESENTANTE,
} from '../config';
import { Contexto } from '../contexto';

/** Coordenação = todas as permissões de cursinho (as da hierarquia da app). */
const PERMISSOES_COORDENACAO: Partial<Role> = Object.fromEntries(
  PERMISSION_HIERARCHY.flatMap((g) => g.permissions)
    .filter((p) => p.type === PermissionType.prepCourse)
    .map((p) => [PERMISSION_FIELD_MAP[p.key], true]),
);
const PERMISSOES: Record<'secretaria' | 'professor', Partial<Role>> = {
  secretaria: {
    gerenciarEstudantes: true,
    visualizarEstudantes: true,
    visualizarTurmas: true,
    gerenciarProcessoSeletivo: true,
  },
  professor: { visualizarTurmas: true, visualizarEstudantes: true },
};

export async function executar(ctx: Contexto) {
  const geo = await ctx.ds.getRepository(Geolocation).save(
    Object.assign(new Geolocation(), {
      name: CURSINHO.nome,
      latitude: CURSINHO.latitude,
      longitude: CURSINHO.longitude,
      cep: CURSINHO.cep,
      state: CURSINHO.estado,
      city: CURSINHO.cidade,
      neighborhood: CURSINHO.bairro,
      street: CURSINHO.rua,
      userFullName: `${REPRESENTANTE.firstName} ${REPRESENTANTE.lastName}`,
      userPhone: REPRESENTANTE.phone,
      userConnection: 'Coordenação',
      userEmail: REPRESENTANTE.email,
      status: Status.Approved,
    }),
  );
  const users = ctx.ds.getRepository(User);
  const representante = await users.findOneByOrFail({
    id: ctx.representanteUserId,
  });
  const cursinho = await ctx.ds.getRepository(PartnerPrepCourse).save(
    Object.assign(new PartnerPrepCourse(), {
      geoId: geo.id,
      representative: representante,
    }),
  );
  ctx.cursinhoId = cursinho.id;

  const roles = ctx.ds.getRepository(Role);
  const novaRole = (name: string, p: Partial<Role>) =>
    roles.save(
      Object.assign(new Role(), {
        name,
        base: false,
        partnerPrepCourse: cursinho,
        ...p,
      }),
    );
  const coordenacao = await novaRole(
    'Coordenação — Semear',
    PERMISSOES_COORDENACAO,
  );
  const porTipo = {
    secretaria: await novaRole('Secretaria — Semear', PERMISSOES.secretaria),
    professor: await novaRole('Professor(a) — Semear', PERMISSOES.professor),
  };

  representante.role = coordenacao;
  await users.save(representante);

  const colabs = ctx.ds.getRepository(Collaborator);
  await colabs.save(
    Object.assign(new Collaborator(), {
      user: representante,
      partnerPrepCourse: cursinho,
      actived: true,
      description: 'Coordenação geral',
    }),
  );

  for (const c of COLABORADORES) {
    const sexo = faker.person.sexType();
    const firstName = faker.person.firstName(sexo);
    const lastName = faker.person.lastName();
    const u = await users.save(
      Object.assign(new User(), {
        email: `${faker.internet
          .username({ firstName, lastName })
          .toLowerCase()}@${DOMINIO_DEMO}`,
        password: faker.internet.password(), // ninguém loga com eles
        firstName,
        lastName,
        phone: faker.phone.number({ style: 'national' }).replace(/\D/g, ''),
        // relativo a `hoje` e sem hora: rodar de novo no mesmo dia dá o mesmo
        birthday: inicioDoDia(
          faker.date.birthdate({
            min: 24,
            max: 55,
            mode: 'age',
            refDate: ctx.hoje,
          }),
        ),
        state: 'SP',
        city: 'São Paulo',
        gender: sexo === 'female' ? Gender.Female : Gender.Male,
        lgpd: true,
        emailConfirmSended: null,
        role: porTipo[c.role],
      }),
    );
    const col = await colabs.save(
      Object.assign(new Collaborator(), {
        user: u,
        partnerPrepCourse: cursinho,
        actived: true,
        description: c.papel,
      }),
    );
    ctx.colaboradores.push({ id: col.id, userId: u.id, papel: c.papel });
  }
  console.log(
    `02 cursinho: ${CURSINHO.nome} + ${COLABORADORES.length + 1} colaboradores`,
  );
}
