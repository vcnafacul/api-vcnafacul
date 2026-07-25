import 'dotenv/config';
import * as fs from 'fs';
import * as readline from 'readline';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/role/role.entity';
import { User } from '../src/modules/user/user.entity';
import { Permissions } from '../src/modules/role/permissions/permissions';

/**
 * Deleta roles "inúteis": aquelas em que TODAS as colunas de permissão são
 * false (equivalentes à role "aluno"), criadas como teste na fase beta.
 *
 * Uso:
 *   node --require ts-node/register scripts/delete-roles-without-permissions.ts            # dry-run (só lista)
 *   node --require ts-node/register scripts/delete-roles-without-permissions.ts --apply    # lista, pede confirmação e deleta
 *   ... --apply --yes                                                                      # pula a confirmação interativa
 *
 * Config lida de .env ou variáveis de ambiente:
 *   MY_HOST, MY_PORT, MY_USER, MY_PASSWORD, MY_DB_NAME
 */

// Nomes das propriedades de permissão na entity Role (chaves do enum Permissions).
// Enum de string não gera reverse mapping, então Object.keys devolve exatamente
// as propriedades da entity (validarCursinho, alterarPermissao, ...).
const PERMISSION_PROPS = Object.keys(Permissions) as (keyof Role)[];

// Roles que nunca devem ser deletadas, mesmo sem permissões.
const PROTECTED_ROLE_NAMES = new Set(['aluno', 'admin']);

interface Args {
  apply: boolean;
  yes: boolean;
}

function parseArgs(argv: string[]): Args {
  return {
    apply: argv.includes('--apply'),
    yes: argv.includes('--yes'),
  };
}

function hasAllPermissionsFalse(role: Role): boolean {
  return PERMISSION_PROPS.every((prop) => role[prop] === false);
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^s|^y/i.test(answer.trim()));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.MY_HOST,
    port: Number(process.env.MY_PORT),
    username: process.env.MY_USER,
    password: process.env.MY_PASSWORD,
    database: process.env.MY_DB_NAME,
    entities: [__dirname + '/../src/**/*.entity.{js,ts}'],
    synchronize: false,
    timezone: 'Z',
  });

  await ds.initialize();
  try {
    const roleRepo = ds.getRepository(Role);

    // Carrega todas as roles com as relações necessárias para as salvaguardas.
    // A tabela roles é pequena (dezenas de linhas), então isso é barato.
    const roles = await roleRepo.find({
      relations: { partnerPrepCourse: true, children: true },
    });

    // Contagem de usuários por role (sem carregar as linhas de users).
    const userCounts = await ds
      .createQueryBuilder()
      .select('u.roleId', 'roleId')
      .addSelect('COUNT(*)', 'cnt')
      .from(User, 'u')
      .groupBy('u.roleId')
      .getRawMany<{ roleId: string; cnt: string }>();
    const usersByRole = new Map(
      userCounts.map((c) => [c.roleId, Number(c.cnt)]),
    );

    // Candidatas: todas as permissões false.
    const candidates = roles.filter(hasAllPermissionsFalse);

    const eligible: Role[] = [];
    const skipped: { role: Role; reason: string }[] = [];

    for (const role of candidates) {
      const users = usersByRole.get(role.id) ?? 0;
      if (PROTECTED_ROLE_NAMES.has(role.name) || role.base) {
        skipped.push({ role, reason: 'role protegida/base' });
      } else if (role.partnerPrepCourse) {
        skipped.push({ role, reason: 'vinculada a um cursinho' });
      } else if (role.children && role.children.length > 0) {
        skipped.push({
          role,
          reason: `é roleBase de ${role.children.length} role(s)`,
        });
      } else if (users > 0) {
        skipped.push({ role, reason: `possui ${users} usuário(s)` });
      } else {
        eligible.push(role);
      }
    }

    console.log(`\nRoles com todas as permissões false: ${candidates.length}`);
    console.log('\nDetalhamento das candidatas:');
    for (const role of candidates) {
      const users = usersByRole.get(role.id) ?? 0;
      const children = role.children?.length ?? 0;
      const cursinho = role.partnerPrepCourse ? 'sim' : 'não';
      console.log(
        `  - ${role.name} (id=${role.id}) | base=${role.base} | usuarios=${users} | filhas=${children} | cursinho=${cursinho}`,
      );
    }

    if (skipped.length > 0) {
      console.log(`\nIgnoradas por salvaguarda (${skipped.length}):`);
      for (const { role, reason } of skipped) {
        console.log(`  - [SKIP] ${role.name} (id=${role.id}) — ${reason}`);
      }
    }

    console.log(`\nElegíveis para deleção (${eligible.length}):`);
    for (const role of eligible) {
      console.log(`  - ${role.name} (id=${role.id})`);
    }

    if (eligible.length === 0) {
      console.log('\nNada a deletar. Encerrando.');
      return;
    }

    // Backup antes de qualquer deleção.
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${__dirname}/roles-backup-${timestamp}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(eligible, null, 2), 'utf-8');
    console.log(`\nBackup das roles elegíveis salvo em: ${backupPath}`);

    if (!args.apply) {
      console.log(
        '\n[dry-run] Nenhuma role foi deletada. Rode novamente com --apply para deletar.',
      );
      return;
    }

    if (!args.yes) {
      const ok = await confirm(
        `\nConfirma a deleção de ${eligible.length} role(s)? [s/N] `,
      );
      if (!ok) {
        console.log('Cancelado. Nenhuma role foi deletada.');
        return;
      }
    }

    const ids = eligible.map((r) => r.id);
    await ds.transaction(async (manager) => {
      await manager.getRepository(Role).delete(ids);
    });

    console.log(`\n${ids.length} role(s) deletada(s) com sucesso.`);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('Falha ao deletar roles sem permissão:', err);
  process.exit(1);
});
