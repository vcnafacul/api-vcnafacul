import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { EnvService } from '../../shared/modules/env/env.service';
import { CreateEmailWhitelistDtoInput } from './dtos/create-email-whitelist.dto.input';
import { EmailWhitelist } from './email-whitelist.entity';

/** Por quanto tempo um e-mail fica liberado depois de cadastrado. */
export const DIAS_DE_LIBERACAO = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

export function validadeDaLiberacao(cadastradoEm: Date): Date {
  return new Date(cadastradoEm.getTime() + DIAS_DE_LIBERACAO * DIA_MS);
}

@Injectable()
export class EmailWhitelistService {
  constructor(
    @InjectRepository(EmailWhitelist)
    private readonly repo: Repository<EmailWhitelist>,
    private readonly envService: EnvService,
  ) {}

  // A whitelist só existe fora de produção: lá as rotas respondem 404.
  private assertNotProduction() {
    if (this.envService.get('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
  }

  async findAll(): Promise<EmailWhitelist[]> {
    this.assertNotProduction();
    return this.repo.find({ order: { email: 'ASC' } });
  }

  async create(
    dto: CreateEmailWhitelistDtoInput,
    agora: Date = new Date(),
  ): Promise<EmailWhitelist> {
    this.assertNotProduction();
    const email = dto.email.trim().toLowerCase();
    if (await this.repo.findOne({ where: { email } })) {
      throw new ConflictException('E-mail já está na whitelist');
    }
    return this.repo.save(
      this.repo.create({
        email,
        note: dto.note?.trim() || null,
        createdAt: agora,
        expiredAt: validadeDaLiberacao(agora),
        isActived: true,
      }),
    );
  }

  /** Desliga as liberações vencidas. Devolve quantas foram desligadas. */
  async desativarVencidos(agora: Date = new Date()): Promise<number> {
    const result = await this.repo.update(
      { isActived: true, expiredAt: LessThanOrEqual(agora) },
      { isActived: false },
    );
    return result.affected ?? 0;
  }

  async remove(id: string): Promise<void> {
    this.assertNotProduction();
    const result = await this.repo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('E-mail não encontrado na whitelist');
    }
  }
}
