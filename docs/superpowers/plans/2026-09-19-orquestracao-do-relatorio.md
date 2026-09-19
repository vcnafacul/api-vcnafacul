# A orquestração do relatório de simulado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar ao cursinho o relatório de um simulado com nome e matrícula de cada estudante — incluindo quem **não** enviou cartão, que é metade do valor para quem coordena.

**Architecture:** A api resolve o cursinho pelo JWT, carrega os estudantes do recorte numa consulta só, pede as linhas ao ms e faz o `left join` em memória partindo dos **estudantes**. O agregado é calculado sobre esse conjunto. As rotas de questões são proxy puro, sem hidratação.

**Tech Stack:** NestJS 10 + TypeORM/MySQL, Jest, supertest.

**Spec:** `docs/superpowers/specs/2026-09-19-orquestracao-do-relatorio-design.md`
**Card:** `vcnafacul-3/docs/cards/relatorio-simulado-cursinho/04-BACK-orquestracao-do-relatorio-na-api.md`

**Repo:** `api-vcnafacul` · **Branch:** `feature/04-orquestracao-do-relatorio` (já criada, spec já commitado)

Tests: `npx jest <path>`. ⚠️ **NUNCA `npm test` neste repo** — ele sobe Docker MySQL e roda a suíte e2e inteira. Build: `npm run build`. Lint: `npx eslint <arquivos>`. Working tree limpa; **adicione arquivos por nome** no commit.

---

## O que o ms já entrega (mergeado)

| rota do ms | devolve |
|---|---|
| `GET v1/relatorio-simulado/:simuladoId?cursinhoId=X[&turmaId=Y]` | `{ linhas[], totalEstudantesComCartaoNoCursinho }` |
| `GET v1/relatorio-simulado/:simuladoId/questoes?cursinhoId=X[&turmaId=Y]` | `{ questoes[] }` |

Cada linha: `usuario`, `turmaId?`, `historicoId`, `status`, `cartaoCode?`, `questoesRespondidas?`,
`aproveitamentoGeral?`, `falha?` (já **descrita**, com `descricao` e `acaoSugerida`).

⚠️ `aproveitamentoGeral` vem **ausente**, não zero, quando não houve leitura concluída. Zero é uma
nota; ausência de leitura não é.

---

## Estrutura de arquivos

| arquivo | responsabilidade | ação |
|---|---|---|
| `src/modules/prepCourse/studentCourse/student-course.repository.ts` | `findEnrolledForRelatorio` — estudantes do recorte numa consulta | modificar |
| `src/modules/simulado/relatorio/relatorio-http.service.ts` | Proxy das duas rotas do ms | **criar** |
| `src/modules/simulado/relatorio/dtos/relatorio.dto.output.ts` | A forma que os cards `05`–`07` consomem | **criar** |
| `src/modules/simulado/relatorio/relatorio.service.ts` | 403, left join, resumo | **criar** |
| `src/modules/simulado/relatorio/relatorio.controller.ts` | As quatro rotas | **criar** |
| `src/modules/simulado/simulado.module.ts` | Registra os três + `ClassRepository` | modificar |

⚠️ `StudentCourseRepository` e `CursinhoResolverService` **já são providers** do `SimuladoModule`
(linhas ~99-100). `ClassRepository` **não** é — precisa entrar.

---

## Task 1: Os estudantes do recorte, numa consulta

**Files:**
- Modify: `src/modules/prepCourse/studentCourse/student-course.repository.ts`
- Test: `src/modules/prepCourse/studentCourse/student-course.repository.spec.ts`

- [ ] **Step 1: Write the failing tests**

Acrescente ao final de `student-course.repository.spec.ts` (o arquivo já monta dublês com
`new StudentCourseRepository({ getRepository: () => repo } as any)` — reuse esse formato):

```ts
describe('StudentCourseRepository.findEnrolledForRelatorio', () => {
  const montar = () => {
    const qb: any = {};
    qb.innerJoin = jest.fn().mockReturnValue(qb);
    qb.leftJoin = jest.fn().mockReturnValue(qb);
    qb.addSelect = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue([]);
    const repository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const entityManager = { getRepository: jest.fn().mockReturnValue(repository) };
    return { repo: new StudentCourseRepository(entityManager as any), qb };
  };

  const clausulas = (qb: any) =>
    [...qb.where.mock.calls, ...qb.andWhere.mock.calls]
      .map((c) => JSON.stringify(c))
      .join(' ');

  it('escopa no cursinho e só traz matriculado', async () => {
    // ⚠️ afirma as chamadas com os argumentos EXATOS: um `toContain('cur-1')`
    // sobreviveria a trocar os parâmetros entre si, como uma revisão anterior
    // provou por mutação num teste irmão
    const { repo, qb } = montar();

    await repo.findEnrolledForRelatorio('cur-1');

    expect(qb.where).toHaveBeenCalledWith('ppc.id = :prepCourseId', {
      prepCourseId: 'cur-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'entity.applicationStatus = :status',
      { status: 'Matriculado' },
    );
  });

  it('sem classId, não filtra por turma — o geral traz quem não tem turma', async () => {
    const { repo, qb } = montar();

    await repo.findEnrolledForRelatorio('cur-1');

    expect(clausulas(qb)).not.toContain('classId');
  });

  it('com classId, restringe à turma', async () => {
    const { repo, qb } = montar();

    await repo.findEnrolledForRelatorio('cur-1', 't-1');

    expect(qb.andWhere).toHaveBeenCalledWith('class.id = :classId', {
      classId: 't-1',
    });
  });

  it('a turma entra por leftJoin — estudante sem turma não pode sumir do geral', async () => {
    const { repo, qb } = montar();

    await repo.findEnrolledForRelatorio('cur-1');

    expect(qb.leftJoin).toHaveBeenCalledWith('entity.class', expect.any(String));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/modules/prepCourse/studentCourse/student-course.repository.spec.ts`
Expected: FAIL — `repo.findEnrolledForRelatorio is not a function`

- [ ] **Step 3: Write the implementation**

Em `student-course.repository.ts`, logo depois de `findByUserIdAndPrepCourse`:

```ts
  /**
   * Os estudantes de um recorte, com o que o relatório precisa mostrar, numa
   * consulta só. Uma por estudante mataria a rota.
   *
   * ⚠️ A turma entra por `leftJoin`: `StudentCourse.class` é opcional, e um
   * `innerJoin` faria o estudante sem turma sumir do relatório geral do
   * cursinho — onde ele é exatamente quem precisa aparecer.
   */
  async findEnrolledForRelatorio(
    prepCourseId: string,
    classId?: string,
  ): Promise<StudentCourse[]> {
    const qb = this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.partnerPrepCourse', 'ppc')
      .where('ppc.id = :prepCourseId', { prepCourseId })
      .innerJoin('entity.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.useSocialName',
      ])
      .leftJoin('entity.class', 'class')
      .addSelect(['class.id', 'class.name'])
      .andWhere('entity.applicationStatus = :status', {
        status: StatusApplication.Enrolled,
      })
      .andWhere('entity.deletedAt IS NULL');

    if (classId !== undefined) {
      qb.andWhere('class.id = :classId', { classId });
    }

    return qb.getMany();
  }
```

✅ Verificado: `StatusApplication` já está importado no arquivo (linha 11, de
`./enums/stastusApplication` — o nome do arquivo tem o typo mesmo). Nada a importar.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/modules/prepCourse/studentCourse/student-course.repository.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/prepCourse/studentCourse/student-course.repository.ts \
        src/modules/prepCourse/studentCourse/student-course.repository.spec.ts
git commit -m "feat: estudantes do recorte do relatório numa consulta só"
```

---

## Task 2: O proxy das duas rotas do ms

**Files:**
- Create: `src/modules/simulado/relatorio/relatorio-http.service.ts`
- Test: `src/modules/simulado/relatorio/relatorio-http.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Criar `src/modules/simulado/relatorio/relatorio-http.service.spec.ts`:

```ts
import { RelatorioHttpService } from './relatorio-http.service';

const montar = () => {
  const axios = { get: jest.fn().mockResolvedValue({}) };
  const httpServiceFactory = { create: jest.fn().mockReturnValue(axios) };
  const envService = { get: jest.fn().mockReturnValue('http://ms') };
  return {
    svc: new RelatorioHttpService(
      httpServiceFactory as any,
      envService as any,
    ),
    axios,
  };
};

describe('RelatorioHttpService', () => {
  it('busca as linhas com o cursinho na query', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1?cursinhoId=cur-1',
    );
  });

  it('acrescenta a turma quando ela vem', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1', 't-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1?cursinhoId=cur-1&turmaId=t-1',
    );
  });

  it('sem turma, NÃO manda turmaId vazio', async () => {
    // `turmaId=` no ms vira filtro por string vazia e devolve lista vazia
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur-1');

    expect(axios.get.mock.calls[0][0]).not.toContain('turmaId');
  });

  it('escapa os valores na query', async () => {
    const { svc, axios } = montar();

    await svc.buscarLinhas('sim-1', 'cur com espaço');

    expect(axios.get.mock.calls[0][0]).toContain('cur%20com%20espa');
  });

  it('busca o agregado por questão na rota de questões', async () => {
    const { svc, axios } = montar();

    await svc.buscarQuestoes('sim-1', 'cur-1', 't-1');

    expect(axios.get).toHaveBeenCalledWith(
      'v1/relatorio-simulado/sim-1/questoes?cursinhoId=cur-1&turmaId=t-1',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/relatorio/`
Expected: FAIL — `Cannot find module './relatorio-http.service'`

- [ ] **Step 3: Write the implementation**

Criar `src/modules/simulado/relatorio/relatorio-http.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class RelatorioHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async buscarLinhas(
    simuladoId: string,
    cursinhoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/${simuladoId}?${this.query(cursinhoId, turmaId)}`,
    );
  }

  async buscarQuestoes(
    simuladoId: string,
    cursinhoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    return this.axios.get(
      `v1/relatorio-simulado/${simuladoId}/questoes?${this.query(
        cursinhoId,
        turmaId,
      )}`,
    );
  }

  /**
   * ⚠️ `turmaId` OMITIDO quando não vem, nunca vazio: `turmaId=` chega ao ms
   * como string vazia, vira filtro por `''` e devolve lista vazia — um
   * relatório em branco sem erro nenhum.
   */
  private query(cursinhoId: string, turmaId?: string): string {
    const p = new URLSearchParams({ cursinhoId });
    if (turmaId !== undefined) {
      p.set('turmaId', turmaId);
    }
    return p.toString();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/relatorio/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/relatorio/relatorio-http.service.ts \
        src/modules/simulado/relatorio/relatorio-http.service.spec.ts
git commit -m "feat: proxy das rotas de relatório do ms"
```

---

## Task 3: O serviço — 403, left join e resumo

**Files:**
- Create: `src/modules/simulado/relatorio/dtos/relatorio.dto.output.ts`, `src/modules/simulado/relatorio/relatorio.service.ts`
- Test: `src/modules/simulado/relatorio/relatorio.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Criar `src/modules/simulado/relatorio/relatorio.service.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';

const estudante = (over: any = {}) => ({
  userId: 'u1',
  cod_enrolled: '2025001',
  user: { firstName: 'Ana', lastName: 'Silva', useSocialName: false },
  class: { id: 't-1', name: 'Turma A' },
  ...over,
});

const linha = (over: any = {}) => ({
  usuario: 'u1',
  turmaId: 't-1',
  historicoId: 'h1',
  status: 'completed',
  cartaoCode: '7',
  questoesRespondidas: 90,
  aproveitamentoGeral: 0.8,
  ...over,
});

const montar = (over: any = {}) => {
  const http = {
    buscarLinhas: jest.fn().mockResolvedValue({
      linhas: over.linhas ?? [],
      totalEstudantesComCartaoNoCursinho: over.totalNoCursinho ?? 0,
    }),
    buscarQuestoes: jest.fn().mockResolvedValue({ questoes: [] }),
  };
  const studentCourseRepository = {
    findEnrolledForRelatorio: jest.fn().mockResolvedValue(over.estudantes ?? []),
  };
  const classRepository = {
    findOneByIdWithPartner: jest
      .fn()
      .mockResolvedValue(
        over.turma === null
          ? null
          : (over.turma ?? { id: 't-1', partnerPrepCourse: { id: 'cur-1' } }),
      ),
  };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };
  return {
    svc: new RelatorioService(
      http as any,
      studentCourseRepository as any,
      classRepository as any,
      cursinhoResolver as any,
    ),
    http,
    studentCourseRepository,
    classRepository,
  };
};

describe('RelatorioService.consultar', () => {
  it('hidrata a linha com nome e matrícula', async () => {
    const { svc } = montar({ estudantes: [estudante()], linhas: [linha()] });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas[0]).toMatchObject({
      usuario: 'u1',
      nome: 'Ana Silva',
      matricula: '2025001',
      enviouCartao: true,
      aproveitamentoGeral: 0.8,
    });
  });

  it('usa o nome social quando o estudante pediu', async () => {
    const { svc } = montar({
      estudantes: [
        estudante({
          user: {
            firstName: 'Ana',
            lastName: 'Silva',
            socialName: 'Ana Beatriz',
            useSocialName: true,
          },
        }),
      ],
      linhas: [linha()],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas[0].nome).toBe('Ana Beatriz');
  });

  it('quem NÃO enviou cartão aparece — é metade do valor do relatório', async () => {
    const { svc } = montar({
      estudantes: [estudante(), estudante({ userId: 'u2', cod_enrolled: '2' })],
      linhas: [linha()],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas).toHaveLength(2);
    const u2 = r.linhas.find((l) => l.usuario === 'u2')!;
    expect(u2.enviouCartao).toBe(false);
    expect(u2.historicoId).toBeUndefined();
    expect(u2.aproveitamentoGeral).toBeUndefined();
  });

  it('a média exclui quem não teve leitura concluída, e mostra as duas contagens', async () => {
    // contar o cartão falho como zero puxaria a média para baixo e a turma
    // pareceria pior do que foi
    const { svc } = montar({
      estudantes: [
        estudante(),
        estudante({ userId: 'u2', cod_enrolled: '2' }),
        estudante({ userId: 'u3', cod_enrolled: '3' }),
      ],
      linhas: [
        linha({ aproveitamentoGeral: 0.8 }),
        linha({
          usuario: 'u2',
          status: 'failed',
          aproveitamentoGeral: undefined,
        }),
      ],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.totalNoRecorte).toBe(3);
    expect(r.resumo.comLeituraConcluida).toBe(1);
    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(0.8);
  });

  it('ninguém com leitura → aproveitamento null, não zero', async () => {
    const { svc } = montar({
      estudantes: [estudante()],
      linhas: [linha({ status: 'failed', aproveitamentoGeral: undefined })],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.aproveitamentoGeral).toBeNull();
    expect(r.resumo.comLeituraConcluida).toBe(0);
  });

  it('conta a linha de quem saiu do cursinho, sem listar o nome', async () => {
    // o estudante foi desmatriculado depois de enviar; a linha fica na junção
    // do ms. Sem contar, os totais param de bater e parece que o sistema
    // perdeu cartão
    const { svc } = montar({
      estudantes: [estudante()],
      linhas: [linha(), linha({ usuario: 'u-que-saiu' })],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas).toHaveLength(1);
    expect(r.resumo.linhasSemEstudanteAtivo).toBe(1);
  });

  it('avisa quando há estudante sem turma no relatório geral', async () => {
    const { svc } = montar({
      estudantes: [estudante({ class: null })],
      linhas: [],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.temEstudanteSemTurma).toBe(true);
  });

  it('repassa o total do cursinho, que alimenta o rodapé da turma', async () => {
    const { svc } = montar({ totalNoCursinho: 30 });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.totalEstudantesComCartaoNoCursinho).toBe(30);
  });
});

describe('RelatorioService.consultar — recorte por turma', () => {
  it('restringe a consulta de estudantes e a do ms à turma', async () => {
    const { svc, http, studentCourseRepository } = montar();

    await svc.consultar('colab-1', 'sim-1', 't-1');

    expect(studentCourseRepository.findEnrolledForRelatorio).toHaveBeenCalledWith(
      'cur-1',
      't-1',
    );
    expect(http.buscarLinhas).toHaveBeenCalledWith('sim-1', 'cur-1', 't-1');
  });

  it('turma de outro cursinho é 403 — não lista vazia', async () => {
    // vazio seria indistinguível de "turma sua, ninguém matriculado"
    const { svc } = montar({
      turma: { id: 't-9', partnerPrepCourse: { id: 'cur-OUTRO' } },
    });

    await expect(svc.consultar('colab-1', 'sim-1', 't-9')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('turma inexistente é 403, não 500', async () => {
    const { svc } = montar({ turma: null });

    await expect(svc.consultar('colab-1', 'sim-1', 't-nada')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('RelatorioService.consultarQuestoes', () => {
  it('é proxy puro — nenhuma consulta de estudante', async () => {
    const { svc, http, studentCourseRepository } = montar();

    await svc.consultarQuestoes('colab-1', 'sim-1');

    expect(http.buscarQuestoes).toHaveBeenCalledWith('sim-1', 'cur-1', undefined);
    expect(studentCourseRepository.findEnrolledForRelatorio).not.toHaveBeenCalled();
  });

  it('turma de outro cursinho é 403 aqui também', async () => {
    const { svc } = montar({
      turma: { id: 't-9', partnerPrepCourse: { id: 'cur-OUTRO' } },
    });

    await expect(
      svc.consultarQuestoes('colab-1', 'sim-1', 't-9'),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/relatorio/`
Expected: FAIL — `Cannot find module './relatorio.service'`

- [ ] **Step 3: Write the implementation**

Criar `src/modules/simulado/relatorio/dtos/relatorio.dto.output.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class LinhaDoRelatorioDtoOutput {
  @ApiProperty() usuario: string;

  @ApiProperty() nome: string;

  @ApiProperty() matricula: string;

  @ApiProperty({ required: false, nullable: true }) turmaId: string | null;

  @ApiProperty({ required: false, nullable: true }) turmaNome: string | null;

  /**
   * Explícito, e não inferido da ausência de `historicoId`: quem infere "não
   * enviou" da falta de um campo infere errado mais cedo ou mais tarde. E um
   * `status: 'nao_enviou'` sintético poluiria o enum do ms com um valor que o
   * ms não conhece.
   */
  @ApiProperty() enviouCartao: boolean;

  @ApiProperty({ required: false }) historicoId?: string;

  @ApiProperty({ required: false }) status?: string;

  @ApiProperty({ required: false }) cartaoCode?: string;

  @ApiProperty({ required: false }) questoesRespondidas?: number;

  /** Ausente, não zero, quando não houve leitura concluída. */
  @ApiProperty({ required: false }) aproveitamentoGeral?: number;

  /** Já descrita pelo ms — `descricao` e `acaoSugerida` prontas. */
  @ApiProperty({ required: false, type: Object }) falha?: Record<string, unknown>;
}

export class ResumoDoRelatorioDtoOutput {
  /** Estudantes matriculados no recorte. */
  @ApiProperty() totalNoRecorte: number;

  /** Denominador da média — só quem teve leitura concluída. */
  @ApiProperty() comLeituraConcluida: number;

  /** `null` quando ninguém teve leitura: zero seria uma nota, e não é. */
  @ApiProperty({ nullable: true }) aproveitamentoGeral: number | null;

  /** Vem do ms. Alimenta o rodapé do relatório por turma. */
  @ApiProperty() totalEstudantesComCartaoNoCursinho: number;

  /** Só faz sentido no relatório geral; a tela avisa quando é verdadeiro. */
  @ApiProperty() temEstudanteSemTurma: boolean;

  /**
   * Linhas do ms sem estudante ativo correspondente — quem saiu do cursinho
   * depois de enviar. Contadas, **nunca listadas**: o nome de quem saiu não é
   * informação que este relatório deva expor. Sem esta contagem os totais
   * param de bater e a leitura natural é "o sistema perdeu cartão".
   */
  @ApiProperty() linhasSemEstudanteAtivo: number;
}

export class RelatorioDtoOutput {
  @ApiProperty({ type: [LinhaDoRelatorioDtoOutput] })
  linhas: LinhaDoRelatorioDtoOutput[];

  @ApiProperty({ type: ResumoDoRelatorioDtoOutput })
  resumo: ResumoDoRelatorioDtoOutput;
}
```

Criar `src/modules/simulado/relatorio/relatorio.service.ts`:

```ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassRepository } from 'src/modules/prepCourse/class/class.repository';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import {
  LinhaDoRelatorioDtoOutput,
  RelatorioDtoOutput,
} from './dtos/relatorio.dto.output';
import { RelatorioHttpService } from './relatorio-http.service';

interface LinhaDoMs {
  usuario: string;
  turmaId?: string;
  historicoId?: string;
  status?: string;
  cartaoCode?: string;
  questoesRespondidas?: number;
  aproveitamentoGeral?: number;
  falha?: Record<string, unknown>;
}

@Injectable()
export class RelatorioService {
  constructor(
    private readonly http: RelatorioHttpService,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly classRepository: ClassRepository,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

  async consultar(
    colaboradorUserId: string,
    simuladoId: string,
    turmaId?: string,
  ): Promise<RelatorioDtoOutput> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);

    const [estudantes, doMs] = await Promise.all([
      this.studentCourseRepository.findEnrolledForRelatorio(
        cursinhoId,
        turmaId,
      ),
      this.http.buscarLinhas(simuladoId, cursinhoId, turmaId) as Promise<{
        linhas: LinhaDoMs[];
        totalEstudantesComCartaoNoCursinho: number;
      }>,
    ]);

    const porUsuario = new Map(doMs.linhas.map((l) => [l.usuario, l]));

    // A lista parte dos ESTUDANTES: quem não enviou some se partir das linhas,
    // e saber quem falta é metade do valor do relatório para quem coordena.
    const linhas = estudantes.map((e) =>
      this.montarLinha(e, porUsuario.get(e.userId)),
    );

    const comLeitura = linhas.filter(
      (l) => l.aproveitamentoGeral !== undefined,
    );

    return {
      linhas,
      resumo: {
        totalNoRecorte: linhas.length,
        comLeituraConcluida: comLeitura.length,
        // null, não zero: zero é uma nota, ausência de leitura não é
        aproveitamentoGeral: comLeitura.length
          ? comLeitura.reduce((s, l) => s + l.aproveitamentoGeral!, 0) /
            comLeitura.length
          : null,
        totalEstudantesComCartaoNoCursinho:
          doMs.totalEstudantesComCartaoNoCursinho,
        temEstudanteSemTurma: linhas.some((l) => l.turmaId === null),
        // quem saiu do cursinho depois de enviar: contado, nunca listado
        linhasSemEstudanteAtivo: doMs.linhas.filter(
          (l) => !estudantes.some((e) => e.userId === l.usuario),
        ).length,
      },
    };
  }

  /** Proxy puro: o agregado por questão não tem dado de estudante. */
  async consultarQuestoes(
    colaboradorUserId: string,
    simuladoId: string,
    turmaId?: string,
  ): Promise<unknown> {
    const cursinhoId = await this.resolverEscopo(colaboradorUserId, turmaId);
    return this.http.buscarQuestoes(simuladoId, cursinhoId, turmaId);
  }

  /**
   * O cursinho vem SEMPRE do JWT, nunca da URL.
   *
   * ⚠️ O 403 da turma não é contra vazamento — a consulta de estudantes já é
   * escopada no cursinho, então aluno de fora nunca volta. É honestidade: sem
   * ele, pedir uma turma que não é sua devolve lista **vazia**, indistinguível
   * de "turma sua, ninguém matriculado".
   */
  private async resolverEscopo(
    colaboradorUserId: string,
    turmaId?: string,
  ): Promise<string> {
    const cursinhoId =
      await this.cursinhoResolver.resolveCursinhoIdByUserId(colaboradorUserId);

    if (turmaId !== undefined) {
      const turma = await this.classRepository.findOneByIdWithPartner(turmaId);
      if (!turma || turma.partnerPrepCourse?.id !== cursinhoId) {
        throw new ForbiddenException('turma não pertence ao seu cursinho');
      }
    }

    return cursinhoId;
  }

  private montarLinha(e: any, doMs?: LinhaDoMs): LinhaDoRelatorioDtoOutput {
    const u = e.user;
    const nome =
      u?.useSocialName && u?.socialName
        ? u.socialName
        : `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();

    return {
      usuario: e.userId,
      nome,
      matricula: e.cod_enrolled,
      turmaId: e.class?.id ?? null,
      turmaNome: e.class?.name ?? null,
      enviouCartao: doMs !== undefined,
      historicoId: doMs?.historicoId,
      status: doMs?.status,
      cartaoCode: doMs?.cartaoCode,
      questoesRespondidas: doMs?.questoesRespondidas,
      aproveitamentoGeral: doMs?.aproveitamentoGeral,
      falha: doMs?.falha,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/relatorio/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/relatorio/dtos/relatorio.dto.output.ts \
        src/modules/simulado/relatorio/relatorio.service.ts \
        src/modules/simulado/relatorio/relatorio.service.spec.ts
git commit -m "feat: serviço do relatório hidrata, faz o left join e resume"
```

---

## Task 4: As quatro rotas

**Files:**
- Create: `src/modules/simulado/relatorio/relatorio.controller.ts`
- Modify: `src/modules/simulado/simulado.module.ts`
- Test: `src/modules/simulado/relatorio/relatorio.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Criar `src/modules/simulado/relatorio/relatorio.controller.spec.ts`:

```ts
import { RelatorioController } from './relatorio.controller';

const montar = () => {
  const service = {
    consultar: jest.fn().mockResolvedValue({ linhas: [], resumo: {} }),
    consultarQuestoes: jest.fn().mockResolvedValue({ questoes: [] }),
  };
  return { ctrl: new RelatorioController(service as any), service };
};

const req = { user: { id: 'colab-1' } } as any;

describe('RelatorioController', () => {
  it('geral do cursinho: passa quem pediu, sem turma', async () => {
    const { ctrl, service } = montar();

    await ctrl.geral('sim-1', req);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1');
  });

  it('por turma: passa a turma', async () => {
    const { ctrl, service } = montar();

    await ctrl.porTurma('sim-1', 't-1', req);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1', 't-1');
  });

  it('questões do cursinho', async () => {
    const { ctrl, service } = montar();

    await ctrl.questoesGeral('sim-1', req);

    expect(service.consultarQuestoes).toHaveBeenCalledWith('colab-1', 'sim-1');
  });

  it('questões da turma', async () => {
    const { ctrl, service } = montar();

    await ctrl.questoesPorTurma('sim-1', 't-1', req);

    expect(service.consultarQuestoes).toHaveBeenCalledWith(
      'colab-1',
      'sim-1',
      't-1',
    );
  });

  it('o cursinho NUNCA vem da URL — só o id de quem pediu é repassado', async () => {
    const { ctrl, service } = montar();

    await ctrl.geral('sim-1', req);

    const args = service.consultar.mock.calls[0];
    expect(args[0]).toBe('colab-1');
    expect(JSON.stringify(args)).not.toContain('cursinho');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/relatorio/relatorio.controller.spec.ts`
Expected: FAIL — `Cannot find module './relatorio.controller'`

- [ ] **Step 3: Write the implementation**

Criar `src/modules/simulado/relatorio/relatorio.controller.ts`:

```ts
import { Controller, Get, Param, Req, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RelatorioDtoOutput } from './dtos/relatorio.dto.output';
import { RelatorioService } from './relatorio.service';

@ApiTags('Simulado - Relatório')
@Controller('mssimulado/relatorio/simulado')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
export class RelatorioController {
  constructor(private readonly service: RelatorioService) {}

  @Get(':simuladoId/turma/:turmaId/questoes')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'agregado por questão da turma' })
  async questoesPorTurma(
    @Param('simuladoId') simuladoId: string,
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.service.consultarQuestoes(
      (req.user as User).id,
      simuladoId,
      turmaId,
    );
  }

  @Get(':simuladoId/turma/:turmaId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: RelatorioDtoOutput })
  async porTurma(
    @Param('simuladoId') simuladoId: string,
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<RelatorioDtoOutput> {
    return this.service.consultar((req.user as User).id, simuladoId, turmaId);
  }

  @Get(':simuladoId/questoes')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'agregado por questão do cursinho' })
  async questoesGeral(
    @Param('simuladoId') simuladoId: string,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.service.consultarQuestoes((req.user as User).id, simuladoId);
  }

  @Get(':simuladoId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: RelatorioDtoOutput })
  async geral(
    @Param('simuladoId') simuladoId: string,
    @Req() req: Request,
  ): Promise<RelatorioDtoOutput> {
    return this.service.consultar((req.user as User).id, simuladoId);
  }
}
```

⚠️ **A ordem das rotas é da mais específica para a mais genérica**, de propósito. Elas diferem em
contagem de segmentos, então não colidem — mas esta casa já foi mordida por colisão literal × `:param`
(ver `questao-rotas.controller.spec.ts` e o docblock da ordem dos controllers em `simulado.module.ts`).
A Task 5 prova que resolvem.

Em `src/modules/simulado/simulado.module.ts`, acrescente estes imports:

```ts
import { ClassRepository } from '../prepCourse/class/class.repository';
import { RelatorioController } from './relatorio/relatorio.controller';
import { RelatorioHttpService } from './relatorio/relatorio-http.service';
import { RelatorioService } from './relatorio/relatorio.service';
```

Acrescente `RelatorioController` ao array `controllers`, e estes três ao array `providers`:

```ts
    ClassRepository,
    RelatorioHttpService,
    RelatorioService,
```

✅ Verificado: `ClassRepository` depende só de `@InjectEntityManager()`, igual ao
`StudentCourseRepository` que já é provider desse módulo — registrar direto funciona, sem importar
o módulo do cursinho.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/relatorio/`
Expected: PASS

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: limpo. ⚠️ É o build que pega provider não registrado — o teste de unidade constrói o
controller à mão.

- [ ] **Step 6: Commit**

```bash
git add src/modules/simulado/relatorio/relatorio.controller.ts \
        src/modules/simulado/relatorio/relatorio.controller.spec.ts \
        src/modules/simulado/simulado.module.ts
git commit -m "feat: as quatro rotas do relatório de simulado"
```

---

## Task 5: O teste que prova que as quatro rotas resolvem

**Files:**
- Create: `src/modules/simulado/relatorio/relatorio-rotas.controller.spec.ts`

⚠️ **Teste de unidade não pega colisão de rota** — ele chama o método direto, sem roteamento. Só um
app de verdade pega. Este repo já tem dois precedentes:
`src/modules/simulado/categoria/cursinho/cursinho-categoria-rotas.controller.spec.ts` e
`src/modules/simulado/questao/questao-rotas.controller.spec.ts`. **Leia o primeiro e siga o padrão.**

- [ ] **Step 1: Write the test**

Criar `src/modules/simulado/relatorio/relatorio-rotas.controller.spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { RelatorioController } from './relatorio.controller';
import { RelatorioService } from './relatorio.service';

/**
 * As quatro rotas montadas num app de verdade.
 *
 * ⚠️ **Só um app pega isto.** `:simuladoId`, `:simuladoId/questoes`,
 * `:simuladoId/turma/:turmaId` e `:simuladoId/turma/:turmaId/questoes` convivem
 * na mesma árvore, e um teste de unidade chama o método direto — nunca
 * exercita o roteamento. Este repositório já foi mordido por colisão literal ×
 * `:param` (ver `questao-rotas.controller.spec.ts`).
 */
describe('Relatório — as quatro rotas resolvem para o handler certo', () => {
  let app: INestApplication;

  const service = {
    consultar: jest.fn(),
    consultarQuestoes: jest.fn(),
  };

  const passaTudo = {
    canActivate: (ctx: any) => {
      ctx.switchToHttp().getRequest().user = { id: 'colab-1' };
      return true;
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [RelatorioController],
      providers: [{ provide: RelatorioService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passaTudo)
      .overrideGuard(PermissionsGuard)
      .useValue(passaTudo)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    service.consultar.mockResolvedValue({ linhas: [], resumo: {} });
    service.consultarQuestoes.mockResolvedValue({ questoes: [] });
    jest.clearAllMocks();
  });

  it('o geral do cursinho cai no handler do geral', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1')
      .expect(200);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1');
    expect(service.consultarQuestoes).not.toHaveBeenCalled();
  });

  it('`/questoes` NÃO é tratado como um simuladoId', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/questoes')
      .expect(200);

    expect(service.consultarQuestoes).toHaveBeenCalledWith('colab-1', 'sim-1');
    expect(service.consultar).not.toHaveBeenCalled();
  });

  it('a rota de turma cai no handler de turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/turma/t-1')
      .expect(200);

    expect(service.consultar).toHaveBeenCalledWith('colab-1', 'sim-1', 't-1');
  });

  it('`/turma/:id/questoes` não é engolida pela rota de turma', async () => {
    await request(app.getHttpServer())
      .get('/mssimulado/relatorio/simulado/sim-1/turma/t-1/questoes')
      .expect(200);

    expect(service.consultarQuestoes).toHaveBeenCalledWith(
      'colab-1',
      'sim-1',
      't-1',
    );
    expect(service.consultar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest src/modules/simulado/relatorio/relatorio-rotas.controller.spec.ts`
Expected: PASS — 4 passed

- [ ] **Step 3: Provar que discrimina**

Temporariamente mova o `@Get(':simuladoId')` para **antes** dos outros três no controller, rode o
teste e relate **exatamente** o que acontece. Depois reverta e confirme `git status` limpo.

⚠️ Se nada ficar vermelho, diga — significa que a ordem não importa aqui (as rotas diferem em
contagem de segmentos), e então este teste vale como trava de regressão mas não como prova de que a
ordem é necessária. **Relate o que mediu, não o que esperava.**

- [ ] **Step 4: Suítes e build**

```bash
npx jest src/modules/simulado src/modules/prepCourse/studentCourse
npm run build
```

⚠️ **Não rode `npm test`** — ele sobe Docker MySQL e a suíte e2e.

Expected: verde, build limpo.

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/relatorio/relatorio-rotas.controller.spec.ts
git commit -m "test: as quatro rotas do relatório resolvem, provado com app de verdade"
```

---

## Verificação final

- [ ] `npx jest src/modules/simulado src/modules/prepCourse` verde · `npm run build` limpo
- [ ] `npx eslint` nos arquivos tocados, sem achados novos
- [ ] `git status` sem arquivo alheio

## ⚠️ Verificação MANUAL obrigatória, e o porquê

**A permissão por rota não é pega por teste de unidade neste repo.** Os testes chamam o método
direto e não passam pelo guard — trocar `gerenciarEstudantes` por outra permissão no `@SetMetadata`
**não deixa nada vermelho**.

Confira as **quatro** rotas à mão, com um usuário que não tenha `gerenciarEstudantes`, e registre o
resultado no PR. Foi exatamente isso que se fez no PR da categoria por cursinho.

- [ ] `GET /mssimulado/relatorio/simulado/:id` → 403 sem a permissão
- [ ] `GET /mssimulado/relatorio/simulado/:id/questoes` → 403 sem a permissão
- [ ] `GET /mssimulado/relatorio/simulado/:id/turma/:t` → 403 sem a permissão
- [ ] `GET /mssimulado/relatorio/simulado/:id/turma/:t/questoes` → 403 sem a permissão
- [ ] Com a permissão, mas turma de outro cursinho → **403**, não lista vazia

## O que vem depois

- **Cards `05`/`06`** montam as telas a partir destas quatro rotas — lista de alunos e aba de
  questões, com o rodapé usando `totalEstudantesComCartaoNoCursinho`.
- **Card `07`** abre o detalhe de um estudante pelo `historicoId` que cada linha carrega.
