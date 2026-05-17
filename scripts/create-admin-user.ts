import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/modules/role/role.entity';
import { User } from '../src/modules/user/user.entity';
import { Gender } from '../src/modules/user/enum/gender';

interface Args {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthday: string;
  state: string;
  city: string;
  gender: Gender;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    (out as Record<string, string>)[k] = v;
  }
  const required: (keyof Args)[] = [
    'email',
    'password',
    'firstName',
    'lastName',
    'phone',
    'birthday',
    'state',
    'city',
    'gender',
  ];
  for (const k of required) {
    if (!out[k]) {
      throw new Error(`Argumento --${k} é obrigatório`);
    }
  }
  return out as Args;
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
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);

    const existing = await userRepo.findOne({ where: { email: args.email } });
    if (existing) {
      console.error(`Usuário ${args.email} já existe (id=${existing.id}).`);
      process.exit(1);
    }

    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      console.error(
        'Role "admin" não encontrada. Rode os seeds antes (npm run seed ou similar).',
      );
      process.exit(1);
    }

    const user = new User();
    user.email = args.email;
    user.password = await bcrypt.hash(args.password, 10);
    user.firstName = args.firstName;
    user.lastName = args.lastName;
    user.phone = args.phone;
    user.birthday = new Date(args.birthday);
    user.state = args.state;
    user.city = args.city;
    user.gender = args.gender;
    user.lgpd = true;
    user.role = adminRole;

    const saved = await userRepo.save(user);
    console.log(
      `Usuário admin criado com sucesso: id=${saved.id} email=${saved.email}`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('Falha ao criar usuário admin:', err);
  process.exit(1);
});
