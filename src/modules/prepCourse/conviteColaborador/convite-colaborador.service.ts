import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { EmailService } from 'src/shared/services/email/email.service';
import { DataSource, EntityManager, LessThanOrEqual } from 'typeorm';
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
  hashDoToken,
  MENSAGEM_DA_SITUACAO,
  normalizarEmail,
  situacaoDoConvite,
  VALIDADE_DO_CONVITE_MS,
} from './convite-colaborador.regras';
import { ConviteDtoOutput } from './dtos/convite.output.dto';
import { ConvitePorTokenDtoOutput } from './dtos/convite-por-token.output.dto';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CreateUserDtoInput } from '../../user/dto/create.dto.input';
import { LoginTokenDTO } from '../../user/dto/login-token.dto.input';
import { CadastroPeloGoogleDtoInput } from '../../user/google/cadastro-pelo-google.dto.input';
import { GoogleAuthService } from '../../user/google/google-auth.service';

/**
 * Convites de colaborador gravados, já com a função (card 03 de
 * `convite-de-colaborador`).
 *
 * ⚠️ **Admin do cursinho ou quem gerencia colaboradores** chega aqui — o guard
 * está no controller. Toda operação é escopada ao cursinho de quem pede.
 *
 * ⚠️ **Sem escalada:** quem não é admin (`gerenciarPermissoesCursinho`) não
 * convida com função de admin, não troca um convite para ela e não mexe num
 * convite que já é de admin — a mesma regra do card 02, pelo convite.
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
    private readonly googleAuthService: GoogleAuthService,
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
    await this.semEscalada(quemPedeId, role);

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
    await this.semEscalada(quemPedeId, convite.role);

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
    await this.semEscalada(quemPedeId, convite.role);
    await this.semEscalada(quemPedeId, role);

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
    await this.semEscalada(quemPedeId, convite.role);

    await this.repo.update(
      { id: convite.id },
      { status: StatusDoConvite.cancelado },
    );
    await this.registrar(cursinho.id, `Convite de ${convite.email} cancelado`);
  }

  /**
   * O que a página do link mostra, antes de qualquer login (cards 04 e 05).
   *
   * ⚠️ **Público, mas só pelo token** — 32 bytes aleatórios, não dá para
   * adivinhar. Expõe só o necessário para a pessoa decidir: cursinho, função,
   * o email convidado (o cadastro do card 05 o trava) e se já existe conta.
   */
  async porToken(token: string): Promise<ConvitePorTokenDtoOutput> {
    const convite = await this.pelaChave(token);
    const usuario = await this.userService.findOneBy({ email: convite.email });
    return {
      nomeCursinho: convite.partnerPrepCourse?.geo?.name ?? '',
      funcao: convite.role?.name ?? '',
      email: convite.email,
      situacao: situacaoDoConvite(convite, new Date()),
      expiraEm: convite.expiraEm,
      temConta: !!usuario,
    };
  }

  /**
   * Aceita o convite: vira colaborador do cursinho JÁ COM A FUNÇÃO (card 04).
   *
   * ⚠️ **Quem aceita é a pessoa LOGADA, e o token não autentica nada.** Antes,
   * o link do convite era um JWT que servia de login (card 01).
   *
   * ⚠️ **O email do convite tem de ser o da conta** — senão quem recebe o link
   * encaminhado entra no cursinho com a conta dele.
   */
  async aceitar(userId: string, token: string): Promise<void> {
    const convite = await this.pelaChave(token);
    const situacao = situacaoDoConvite(convite, new Date());
    if (situacao !== 'pendente') {
      throw new HttpException(
        MENSAGEM_DA_SITUACAO[situacao],
        HttpStatus.BAD_REQUEST,
      );
    }

    const usuario = await this.userService.findOneBy({ id: userId });
    if (!usuario || normalizarEmail(usuario.email) !== convite.email) {
      throw new HttpException(
        `Este convite foi enviado para ${convite.email}. Entre com essa conta para aceitá-lo.`,
        HttpStatus.FORBIDDEN,
      );
    }

    /*
      ⚠️ **De novo, e não só no convite**: a pessoa pode ter virado
      colaboradora de outro cursinho entre o convite e o aceite.
    */
    const colaborador =
      await this.collaboratorRepository.findOneByUserId(userId);
    if (colaborador) {
      throw new HttpException(
        colaborador.partnerPrepCourse?.id === convite.partnerPrepCourseId
          ? 'Você já é colaborador deste cursinho.'
          : 'Você já está vinculado a outro cursinho e não pode aceitar este convite no momento.',
        HttpStatus.CONFLICT,
      );
    }

    try {
      await this.dataSource.transaction((manager) =>
        this.vincular(manager, convite, userId),
      );
    } catch (erro) {
      throw this.traduzirCorrida(erro);
    }

    await this.registrar(
      convite.partnerPrepCourseId,
      `${usuario.firstName} ${usuario.lastName} (${usuario.email}) aceitou o convite como "${convite.role?.name ?? ''}"`,
    );
  }

  /**
   * Cadastro pelo convite (card 05): cria a conta E aceita o convite, na
   * MESMA transação — e sai logado.
   *
   * ⚠️ **Sem a etapa de confirmar email**: o clique no link mandado àquele
   * email já prova que ele é da pessoa. Por isso o email tem de ser o do
   * convite — senão um convite para `a@x.com` criaria conta confirmada para
   * `b@y.com`.
   *
   * ⚠️ **Se o vínculo falha, a conta não é criada.** Criar a conta e deixar o
   * convite pendurado confundiria a pessoa.
   */
  async cadastrar(
    token: string,
    dados: CreateUserDtoInput,
  ): Promise<LoginTokenDTO> {
    const convite = await this.conviteParaCadastro(token, dados.email);
    return this.criarContaEVincular(
      convite,
      (manager) =>
        this.userService.createUser(
          { ...dados, email: convite.email },
          { manager, emailConfirmado: true },
        ),
      'criou a conta pelo convite',
    );
  }

  /**
   * Cadastro pelo convite **com o Google** (card 05 de `login-com-google`): o
   * mesmo do `cadastrar`, com o email e o `googleId` vindos do cadastro
   * pendente do Google (cookie `google_cadastro`), e sem senha.
   *
   * ⚠️ **O email do Google tem de ser o do convite** — a mesma regra do email
   * travado: o convite prova só aquele email.
   */
  async cadastrarPeloGoogle(
    tokenDoCadastro: string | undefined,
    dados: CadastroPeloGoogleDtoInput,
  ): Promise<LoginTokenDTO> {
    const { perfil, convite: tokenDoConvite } =
      await this.googleAuthService.lerCadastro(tokenDoCadastro);
    if (!tokenDoConvite) {
      throw new HttpException(
        'Este cadastro não veio de um convite.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const convite = await this.conviteParaCadastro(
      tokenDoConvite,
      perfil.email,
    );
    return this.criarContaEVincular(
      convite,
      (manager) =>
        this.userService.createUser(
          { ...dados, email: convite.email } as CreateUserDtoInput,
          { manager, emailConfirmado: true, googleId: perfil.googleId },
        ),
      'criou a conta pelo Google, pelo convite,',
    );
  }

  /** O convite, se ainda vale para criar a conta de `email`. */
  private async conviteParaCadastro(
    token: string,
    email: string,
  ): Promise<ConviteColaborador> {
    const convite = await this.pelaChave(token);
    const situacao = situacaoDoConvite(convite, new Date());
    if (situacao !== 'pendente') {
      throw new HttpException(
        MENSAGEM_DA_SITUACAO[situacao],
        HttpStatus.BAD_REQUEST,
      );
    }
    if (normalizarEmail(email) !== convite.email) {
      throw new HttpException(
        `O cadastro por este convite tem de usar o email ${convite.email}.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (await this.userService.findOneBy({ email: convite.email })) {
      throw new HttpException(
        'Já existe uma conta com este email — entre com ela para aceitar o convite.',
        HttpStatus.CONFLICT,
      );
    }
    return convite;
  }

  /**
   * ⚠️ **Se o vínculo falha, a conta não é criada** — mesma transação.
   * Criar a conta e deixar o convite pendurado confundiria a pessoa.
   */
  private async criarContaEVincular(
    convite: ConviteColaborador,
    criarConta: (manager: EntityManager) => Promise<User>,
    comoEntrou: string,
  ): Promise<LoginTokenDTO> {
    let userId: string;
    try {
      await this.dataSource.transaction(async (manager) => {
        const usuario = await criarConta(manager);
        userId = usuario.id;
        await this.vincular(manager, convite, usuario.id);
      });
    } catch (erro) {
      throw this.traduzirCorrida(erro);
    }

    const usuario = await this.userService.findOneBy({ id: userId! });
    await this.registrar(
      convite.partnerPrepCourseId,
      `${usuario.firstName} ${usuario.lastName} (${usuario.email}) ${comoEntrou} e entrou como "${convite.role?.name ?? ''}"`,
    );
    return await this.userService.emitirSessao(usuario);
  }

  /**
   * Liga a pessoa ao cursinho com a função — o miolo do aceite e do cadastro.
   *
   * ⚠️ O convite é marcado `aceito` **condicionado a `pendente`**: dois
   * aceites em paralelo, o segundo não acha mais o pendente e não escreve.
   */
  private async vincular(
    manager: EntityManager,
    convite: ConviteColaborador,
    userId: string,
  ): Promise<void> {
    const { affected } = await manager
      .getRepository(ConviteColaborador)
      .update(
        { id: convite.id, status: StatusDoConvite.pendente },
        { status: StatusDoConvite.aceito, aceitoPorId: userId },
      );
    if (!affected) {
      throw new HttpException(
        'Este convite já foi usado.',
        HttpStatus.CONFLICT,
      );
    }
    await manager.getRepository(Collaborator).save(
      manager.getRepository(Collaborator).create({
        user: { id: userId } as User,
        partnerPrepCourse: {
          id: convite.partnerPrepCourseId,
        } as PartnerPrepCourse,
        description: '',
      }),
    );
    await manager
      .getRepository(User)
      .update({ id: userId }, { role: { id: convite.roleId } as Role });
  }

  /** ⚠️ `UNIQUE (user_id)` em `collaborators` fecha a corrida com outro aceite. */
  private traduzirCorrida(erro: unknown): unknown {
    return (erro as { code?: string })?.code === 'ER_DUP_ENTRY'
      ? new HttpException(
          'Você já é colaborador de um cursinho.',
          HttpStatus.CONFLICT,
        )
      : erro;
  }

  /** O convite pelo token do link — 404 se não existir. */
  private async pelaChave(token: string): Promise<ConviteColaborador> {
    const convite = await this.repo.findOne({
      where: { tokenHash: hashDoToken(token) },
      relations: ['role', 'partnerPrepCourse', 'partnerPrepCourse.geo'],
    });
    if (!convite) {
      throw new HttpException(
        'Convite não encontrado. Ele pode ter sido reenviado — use o link do email mais recente.',
        HttpStatus.NOT_FOUND,
      );
    }
    return convite;
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

  /**
   * ⚠️ **Quem só gerencia colaboradores não chega à função de admin.** Sem isto,
   * convidaria alguém — ou um segundo email seu — com
   * `gerenciarPermissoesCursinho`, e viraria admin pelo convite.
   */
  private async semEscalada(quemPedeId: string, role: Role | undefined) {
    if (!role?.gerenciarPermissoesCursinho) return;
    const quemPede = await this.userService.findOneBy({ id: quemPedeId });
    if (quemPede?.role?.gerenciarPermissoesCursinho) return;
    throw new HttpException(
      'Só o administrador do cursinho pode convidar para uma função de administração.',
      HttpStatus.FORBIDDEN,
    );
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
