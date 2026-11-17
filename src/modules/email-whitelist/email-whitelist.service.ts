import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvService } from '../../shared/modules/env/env.service';
import { CreateEmailWhitelistDtoInput } from './dtos/create-email-whitelist.dto.input';
import { EmailWhitelist } from './email-whitelist.entity';

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

  async create(dto: CreateEmailWhitelistDtoInput): Promise<EmailWhitelist> {
    this.assertNotProduction();
    const email = dto.email.trim().toLowerCase();
    if (await this.repo.findOne({ where: { email } })) {
      throw new ConflictException('E-mail já está na whitelist');
    }
    return this.repo.save(
      this.repo.create({ email, note: dto.note?.trim() || null }),
    );
  }

  async remove(id: string): Promise<void> {
    this.assertNotProduction();
    const result = await this.repo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('E-mail não encontrado na whitelist');
    }
  }
}
