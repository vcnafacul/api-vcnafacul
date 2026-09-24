import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { EmailService } from 'src/shared/services/email/email.service';
import { DataSource, LessThanOrEqual } from 'typeorm';
import { Role } from '../../role/role.entity';
import { RoleService } from '../../role/role.service';
import { User } from '../../user/user.entity';
import { UserService } from '../../user/user.service';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { LogPartner } from '../partnerPrepCourse/log-partner/log-partner.entity';
import { LogPartnerRepository } from '../partnerPrepCourse/log-partner/log-partner.repository';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import {
  ConviteColaborador,
  StatusDoConvite,
} from './convite-colaborador.entity';
import {
  dataCurta,
  gerarTokenDeConvite,
  normalizarEmail,
  situacaoDoConvite,
  VALIDADE_DO_CONVITE_MS,
} from './convite-colaborador.regras';
import { ConviteDtoOutput } from './dtos/convite.output.dto';

/**
 * Convites de colaborador gravados, já com a função (card 03 de
 * `convite-de-colaborador`).
 *
 * ⚠️ **Só o admin do cursinho** (`gerenciarPermissoesCursinho`) chega aqui — o
 * guard está no controller. Toda operação é escopada ao cursinho de quem pede.
 */
@Injectable()
export class ConviteColaboradorService {
  private readonly logger = new Logger(ConviteColaboradorService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly partnerRepository: PartnerPrepCourseRepository,
    private readonly userService: UserService,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly roleService: RoleService,
    private readonly emailService: EmailService,
    private readonly logPartnerRepository: LogPartnerRepository,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(ConviteColaborador);
  }

  async criar(
    quemPedeId: string,
    emailInformado: string,
    roleId: string,
  ): Promise<ConviteDtoOutput> {
    const cursinho = await this.cursinhoDe(quemPedeId);
    const email = normalizarEmail(emailInformado);
    const role = await this.funcaoDoCursinho(roleId, cursinho);

    /*
      ⚠️ **"Outro cursinho = Não"**, decidido 2026-09-24. Com `Collaborator` 1:1
      com `User` (UNIQUE em `user_id`), não há como distinguir quem saiu de
      quem está — então qualquer linha em outro cursinho bloqueia. A série
      `desligamento-de-colaborador` troca isto por "vínculo ATIVO".
    */
    const usuario = await this.userService.findOneBy({ email });
    if (usuario) {
      const colaborador = await this.collaboratorRepository.findOneByUserId(
        usuario.id,
      );
      if (colaborador) {
        throw new HttpException(
          colaborador.partnerPrepCourse?.id === cursinho.id
            ? 'Esta pessoa já é colaboradora deste cursinho.'
            : 'Esta pessoa já está vinculada a outro cursinho e não pode ser convidada no momento.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const { token, hash } = gerarTokenDeConvite();
    const agora = new Date();
    let convite: ConviteColaborador;
    try {
      convite = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(ConviteColaborador);
        /*
          ⚠️ O pendente VENCIDO ocupa a `chave_ativa` — vira `expirado` aqui,
          na mesma transação, e libera a chave para o novo.
        */
        await repo.update(
          {
            email,
            partnerPrepCourseId: cursinho.id,
            status: StatusDoConvite.pendente,
            expiraEm: LessThanOrEqual(agora),
          },
          { status: StatusDoConvite.expirado },
        );
        const vigente = await repo.findOne({
          where: {
            email,
            partnerPrepCourseId: cursinho.id,
            status: StatusDoConvite.pendente,
          },
        });
        if (vigente) {
          throw new HttpException(
            `Já existe um convite pendente para este email, válido até ${dataCurta(vigente.expiraEm)}.`,
            HttpStatus.CONFLICT,
          );
        }
        return await repo.save(
          repo.create({
            email,
            partnerPrepCourseId: cursinho.id,
            roleId: role.id,
            convidadoPorId: quemPedeId,
            tokenHash: hash,
            status: StatusDoConvite.pendente,
            expiraEm: new Date(agora.getTime() + VALIDADE_DO_CONVITE_MS),
          }),
        );
      });
    } catch (erro) {
      /*
        ⚠️ **A corrida que a checagem acima não fecha.** Duas requisições iguais
        passam juntas pelo `findOne` — o índice único da `chave_ativa` recusa
        a segunda, e aqui ela vira a mesma mensagem.
      */
      if ((erro as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new HttpException(
          'Já existe um convite pendente para este email.',
          HttpStatus.CONFLICT,
        );
      }
      throw erro;
    }

    const quemPede = await this.userService.findOneBy({ id: quemPedeId });
    await this.enviar(
      convite,
      token,
      usuario ?? null,
      cursinho,
      role,
      quemPede,
    );
    await this.registrar(
      cursinho.id,
      `Convite enviado para ${email} como "${role.name}"`,
    );
    return this.paraSaida(convite, role, quemPede);
  }

  async listar(quemPedeId: string): Promise<ConviteDtoOutput[]> {
    const cursinho = await this.cursinhoDe(quemPedeId);
    const convites = await this.repo.find({
      where: { partnerPrepCourseId: cursinho.id },
      relations: ['role', 'convidadoPor'],
      order: { createdAt: 'DESC' },
    });
    return convites.map((c) => this.paraSaida(c, c.role, c.convidadoPor));
  }

  /**
   * Manda o convite de novo.
   *
   * ⚠️ **Token novo — o link anterior deixa de valer.** Só o mais recente
   * funciona: um link antigo encaminhado para outra pessoa morre aqui. E a
   * validade recomeça: são 7 dias a partir do reenvio.
   */
  async reenviar(quemPedeId: string, id: string): Promise<ConviteDtoOutput> {
    const cursinho = await this.cursinhoDe(quemPedeId);
    const convite = await this.pendenteDoCursinho(id, cursinho);

    const { token, hash } = gerarTokenDeConvite();
    convite.tokenHash = hash;
    convite.expiraEm = new Date(Date.now() + VALIDADE_DO_CONVITE_MS);
    await this.repo.update(
      { id: convite.id },
      { tokenHash: convite.tokenHash, expiraEm: convite.expiraEm },
    );

    const [usuario, quemPede] = await Promise.all([
      this.userService.findOneBy({ email: convite.email }),
      this.userService.findOneBy({ id: quemPedeId }),
    ]);
    await this.enviar(
      convite,
      token,
      usuario ?? null,
      cursinho,
      convite.role,
      quemPede,
    );
    await this.registrar(
      cursinho.id,
      `Convite reenviado para ${convite.email}`,
    );
    return this.paraSaida(convite, convite.role, convite.convidadoPor);
  }

  /**
   * ⚠️ **Sem reenviar o email**: a página do link lê a função do banco na hora,
   * então o convite já enviado passa a mostrar a nova.
   */
  async trocarFuncao(
    quemPedeId: string,
    id: string,
    roleId: string,
  ): Promise<ConviteDtoOutput> {
    const cursinho = await this.cursinhoDe(quemPedeId);
    const convite = await this.pendenteDoCursinho(id, cursinho);
    const role = await this.funcaoDoCursinho(roleId, cursinho);

    await this.repo.update({ id: convite.id }, { roleId: role.id });
    await this.registrar(
      cursinho.id,
      `Função do convite de ${convite.email} alterada para "${role.name}"`,
    );
    return this.paraSaida(
      { ...convite, roleId: role.id },
      role,
      convite.convidadoPor,
    );
  }

  async cancelar(quemPedeId: string, id: string): Promise<void> {
    const cursinho = await this.cursinhoDe(quemPedeId);
    const convite = await this.pendenteDoCursinho(id, cursinho);

    await this.repo.update(
      { id: convite.id },
      { status: StatusDoConvite.cancelado },
    );
    await this.registrar(cursinho.id, `Convite de ${convite.email} cancelado`);
  }

  private async cursinhoDe(quemPedeId: string): Promise<PartnerPrepCourse> {
    const cursinho = await this.partnerRepository.findOneByUserId(quemPedeId);
    if (!cursinho) {
      throw new HttpException(
        'Cursinho parceiro não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    return cursinho;
  }

  /** ⚠️ Só função DESTE cursinho — nem de outro, nem da plataforma. */
  private async funcaoDoCursinho(
    roleId: string,
    cursinho: PartnerPrepCourse,
  ): Promise<Role> {
    const role = await this.roleService.findOneByIdWithPartner(roleId);
    if (!role || role.partnerPrepCourse?.id !== cursinho.id) {
      throw new HttpException(
        'Esta função não pertence a este cursinho.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return role;
  }

  /**
   * O convite, do cursinho de quem pede, ainda válido.
   *
   * ⚠️ De outro cursinho responde 404, e não 403 — não confirma que o id
   * existe.
   */
  private async pendenteDoCursinho(
    id: string,
    cursinho: PartnerPrepCourse,
  ): Promise<ConviteColaborador> {
    const convite = await this.repo.findOne({
      where: { id, partnerPrepCourseId: cursinho.id },
      relations: ['role', 'convidadoPor'],
    });
    if (!convite) {
      throw new HttpException('Convite não encontrado', HttpStatus.NOT_FOUND);
    }
    if (situacaoDoConvite(convite, new Date()) !== 'pendente') {
      throw new HttpException(
        'Este convite não está mais pendente.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return convite;
  }

  private async enviar(
    convite: ConviteColaborador,
    token: string,
    usuario: User | null,
    cursinho: PartnerPrepCourse,
    role: Role,
    quemPede: User | null,
  ) {
    await this.emailService.sendConviteColaborador({
      email: convite.email,
      nome: usuario?.firstName ?? null,
      nomeGestor: quemPede
        ? `${quemPede.firstName} ${quemPede.lastName}`
        : 'A coordenação',
      nomeCursinho: cursinho.geo?.name ?? '',
      funcao: role.name,
      token,
      temConta: !!usuario,
      validoAte: dataCurta(convite.expiraEm),
    });
    this.logger.log(
      JSON.stringify({
        event: 'conviteColaborador',
        conviteId: convite.id,
        partnerId: cursinho.id,
        temConta: !!usuario,
      }),
    );
  }

  private async registrar(partnerId: string, description: string) {
    const log = new LogPartner();
    log.partnerId = partnerId;
    log.description = description;
    await this.logPartnerRepository.create(log);
  }

  private paraSaida(
    convite: ConviteColaborador,
    role: Role,
    convidadoPor: User | null,
  ): ConviteDtoOutput {
    return {
      id: convite.id,
      email: convite.email,
      funcao: { id: role.id, nome: role.name },
      convidadoPor: convidadoPor
        ? `${convidadoPor.firstName} ${convidadoPor.lastName}`
        : '',
      situacao: situacaoDoConvite(convite, new Date()),
      expiraEm: convite.expiraEm,
      createdAt: convite.createdAt,
    };
  }
}
