import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AggregatePeriodDtoInput } from 'src/shared/dtos/aggregate-period.dto.input';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { BaseService } from 'src/shared/modules/base/base.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { CollaboratorFrenteRepository } from '../prepCourse/collaborator/collaborator-frente.repository';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { AfinidadeDto } from '../prepCourse/collaborator/dtos/collaborator-frentes.dto.output';
import { StudentCourseRepository } from '../prepCourse/studentCourse/student-course.repository';
import { Role } from '../role/role.entity';
import { RoleRepository } from '../role/role.repository';
import { FrenteProxyService } from '../simulado/frente/frente.service';
import { MateriaProxyService } from '../simulado/materia/materia.service';
import { AggregateUserLastAcessDtoOutput } from './dto/aggregate-user-last-acess.dto.output';
import { AggregateUserPeriodDtoOutput } from './dto/aggregate-user-period.dto.output';
import { AggregateUsersByRoleDtoOutput } from './dto/aggregate-users-by-role.dto.output';
import { CreateUserDtoInput } from './dto/create.dto.input';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { LoginTokenDTO } from './dto/login-token.dto.input';
import { LoginDtoInput } from './dto/login.dto.input';
import { ResetPasswordDtoInput } from './dto/reset-password.dto.input';
import { SearchUsersDtoInput } from './dto/search-users.dto.input';
import { SearchUsersDtoOutput } from './dto/search-users.dto.output';
import { UpdateUserDTOInput } from './dto/update.dto.input';
import { UserDtoOutput } from './dto/user.dto.output';
import { UserWithRoleName } from './dto/userWithRoleName';
import { CreateFlow } from './enum/create-flow';
import { RefreshTokenService } from './services/refresh-token.service';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly collaboratorFrenteRepository: CollaboratorFrenteRepository,
    private readonly frenteProxyService: FrenteProxyService,
    private readonly materiaProxyService: MateriaProxyService,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly discordWebhook: DiscordWebhook,
    private readonly envService: EnvService,
    private readonly cache: CacheService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    super(userRepository);
  }
  private readonly logger = new Logger(UserService.name);

  async create(userDto: CreateUserDtoInput): Promise<void> {
    const user = await this.createUser(userDto);
    const token = await this.jwtService.signAsync(
      { user: { id: user.id, flow: CreateFlow.DEFAULT } },
      { expiresIn: '2h' },
    );
    await this.emailService.sendCreateUser(user, token);
  }

  async createUser(userDto: CreateUserDtoInput) {
    try {
      // Validação de senha
      if (userDto.password !== userDto.password_confirmation) {
        throw new HttpException('As senhas não coincidem', HttpStatus.CONFLICT);
      }

      // Validação de idade mínima
      const birthDate = new Date(userDto.birthday);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      const hasMinAge =
        age > 14 ||
        (age === 14 && (monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0)));

      if (!hasMinAge) {
        throw new HttpException(
          'Você deve ter no mínimo 14 anos para se cadastrar',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Criação do usuário
      const newUser = this.convertDtoToDomain(userDto);
      const role = await this.roleRepository.findOneBy({ name: 'aluno' });

      if (!role) {
        throw new HttpException('Role não encontrada', HttpStatus.BAD_REQUEST);
      }

      newUser.role = role;
      if (userDto.socialName) newUser.useSocialName = true;

      const user = await this.userRepository.create(newUser);

      this.logger.log('User created: ' + user.id + ' - ' + user.email);
      return user;
    } catch (error) {
      const env = this.envService.get('NODE_ENV');
      if (env !== 'test') {
        await this.discordWebhook.sendMessage(
          `Erro ao criar usuário: ${error}`,
        );
      }
      this.logger.error(`Erro ao criar usuário: ${error}`);
      if (error.code === '23505') {
        throw new HttpException('Email já cadastrado', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async confirmEmail(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (!user.emailConfirmSended) {
      throw new HttpException('Email already valided', HttpStatus.CONFLICT);
    }
    this.logger.log('User confirmed email: ' + user.email);
    user.emailConfirmSended = null;
    user.password = undefined;
    await this._repository.update(user);
    return this.getAccessToken(user);
  }

  async signIn(loginInput: LoginDtoInput): Promise<LoginTokenDTO> {
    const bcrypt = await import('bcrypt');
    const userFullInfo = await this.userRepository.findOneBy({
      email: loginInput.email,
    });
    if (!userFullInfo || userFullInfo.deletedAt != null) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (!(await bcrypt.compare(loginInput.password, userFullInfo?.password))) {
      throw new HttpException('password invalid', HttpStatus.CONFLICT);
    }
    if (!userFullInfo.emailConfirmSended) {
      await this.userRepository.updateLastAcess(userFullInfo);
      return this.getAccessToken(userFullInfo);
    }

    if (this.haveLess2Hours(userFullInfo.emailConfirmSended))
      throw new HttpException(
        'waiting email validation',
        HttpStatus.UNAUTHORIZED,
      );
    else {
      const token = await this.jwtService.signAsync(
        { user: { id: userFullInfo.id, flow: CreateFlow.DEFAULT } },
        { expiresIn: '15m' },
      );
      await this.emailService.sendCreateUser(userFullInfo, token);
      userFullInfo.password = undefined;
      userFullInfo.emailConfirmSended = new Date();
      await this._repository.update(userFullInfo);
      throw new HttpException(
        'email confirmation sended',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async findUserById(id: string): Promise<User> {
    return await this.userRepository.findOneBy({ id });
  }

  async update(updateUser: UpdateUserDTOInput, id: string) {
    const user = await this.userRepository.findOneBy({ id });

    const originalUser = JSON.parse(JSON.stringify(user));

    const nonNullUpdates = Object.fromEntries(
      Object.entries(updateUser).filter(([, value]) => value != null),
    );

    Object.assign(user, nonNullUpdates);

    const isChanged = JSON.stringify(originalUser) !== JSON.stringify(user);

    if (isChanged) {
      await this.userRepository.update(user);
      return true;
    }
    return false;
  }

  async updateEntity(user: User) {
    await this.userRepository.update(user);
  }

  async deleteUser(id: string) {
    const user = await this.findUserById(id);
    await this.userRepository.deleteUser(user);
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOneBy({ email });
    const token = await this.jwtService.signAsync(
      { user: { id: user.id } },
      { expiresIn: '2h' },
    );
    await this.emailService.sendForgotPasswordMail(
      user.firstName,
      email,
      token,
    );
  }

  async reset(resetPassword: ResetPasswordDtoInput, userId: string) {
    const bcrypt = await import('bcrypt');
    const user = await this.findUserById(userId);
    if (resetPassword.password) {
      // Verifica se a senha está presente
      user.password = await bcrypt.hash(resetPassword.password, 10);
    }
    await this.userRepository.update(user);
  }

  async getvalidateGeo(): Promise<string[]> {
    return (await this.userRepository.getValidatorGeo()).map(
      (user) => user.email,
    );
  }

  async me(userId: string) {
    const collaborator =
      await this.collaboratorRepository.findOneByUserId(userId);
    const userDto = this.MapUsertoUserDTO(
      await this.userRepository.findOneBy({ id: userId }),
    );
    if (collaborator) {
      userDto.collaborator = true;
      userDto.collaboratorPhoto = collaborator.photo;
      userDto.collaboratorDescription = collaborator.description;
      // Enriched frente data — assembled server-side (single pass optimization)
      const afinidades = await this.buildAfinidades(collaborator.id);
      userDto.collaboratorFrentes = afinidades.map((a) => a.frenteId);
      userDto.afinidades = afinidades;
    }
    return userDto;
  }

  private async buildAfinidades(
    collaboratorId: string,
  ): Promise<AfinidadeDto[]> {
    const records =
      await this.collaboratorFrenteRepository.findByCollaboratorId(
        collaboratorId,
      );
    const frenteIds = records.map((r) => r.frenteId);

    const frenteResults = await Promise.all(
      frenteIds.map(async (id) => {
        try {
          const frente = await this.frenteProxyService.getById(id);
          const record = records.find((r) => r.frenteId === id);
          return { frente, record };
        } catch {
          return null;
        }
      }),
    );
    const valid = frenteResults.filter(Boolean) as {
      frente: any;
      record: (typeof records)[number];
    }[];

    const uniqueMateriaIds = [
      ...new Set(valid.map((v) => String(v.frente.materia))),
    ];
    const materiaResults = await Promise.all(
      uniqueMateriaIds.map((id) =>
        this.materiaProxyService.getById(id).catch(() => null),
      ),
    );
    const validMaterias = materiaResults.filter(Boolean) as any[];
    const materiaMap = new Map(validMaterias.map((m) => [String(m._id), m]));

    return valid.map(({ frente, record }) => {
      const materiaId = String(frente.materia);
      const materia = materiaMap.get(materiaId);
      return {
        frenteId: String(frente._id),
        frenteNome: frente.nome,
        materiaId,
        materiaNome: materia?.nome ?? '',
        adicionadoEm: record.createdAt,
      };
    });
  }

  async checkUserPermission(id: string, roleName: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOneBy({ id });
      return user.role[roleName];
    } catch (error) {
      return false;
    }
  }

  async findAllByWithRoleName({
    page,
    limit,
    name,
  }: GetUserDtoInput): Promise<GetAllDtoOutput<UserWithRoleName>> {
    const result = await this.userRepository.findAllBy({
      name,
      page,
      limit,
    });

    const data = result.data.map((user) => ({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        birthday: user.birthday,
        about: user.about,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
        socialName: user.socialName,
        city: user.city,
        state: user.state,
        lgpd: user.lgpd,
        lastAccess: user.lastAccess,
      },
      roleId: user.role.id,
      roleName: user.role.name,
    }));

    return Object.assign(new GetAllDtoOutput<UserWithRoleName>(), {
      data: data,
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
    });
  }

  async updateRole(id: string, roleId: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }
    user.role = role;
    await this.userRepository.update(user);
  }

  async aggregateUsersByPeriod({
    groupBy,
  }: AggregatePeriodDtoInput): Promise<AggregateUserPeriodDtoOutput[]> {
    // return this.userRepository.aggregateUsersByPeriod(groupBy);
    return await this.cache.wrap<AggregateUserPeriodDtoOutput[]>(
      `aggregateUsersByPeriod:${groupBy}`,
      async () => await this.userRepository.aggregateUsersByPeriod(groupBy),
    );
  }

  async aggregateUsersByRole() {
    return await this.cache.wrap<AggregateUsersByRoleDtoOutput[]>(
      'aggregateUsersByRole',
      async () => await this.userRepository.aggregateUsersByRole(),
    );
  }

  async aggregateUsersByLastAcess({ groupBy }: AggregatePeriodDtoInput) {
    return await this.cache.wrap<AggregateUserLastAcessDtoOutput[]>(
      `aggregateUsersByLastAcess:${groupBy}`,
      async () => await this.userRepository.aggregateUsersByLastAcess(groupBy),
    );
  }

  private convertDtoToDomain(userDto: CreateUserDtoInput): User {
    const newUser = new User();
    return Object.assign(newUser, userDto) as User;
  }

  private async getAccessToken(domain: User): Promise<LoginTokenDTO> {
    const roles = this.mapperRole(domain.role);
    const user = this.MapUsertoUserDTO(domain);

    // Verifica se o usuário possui studentCourse cadastrado
    const hasStudentCourse = await this.studentCourseRepository.existsByUserId(
      domain.id,
    );
    if (hasStudentCourse) {
      roles.push('visualizarMinhasInscricoes');
    }

    // Gera o access token (15 minutos)
    const accessToken = await this.jwtService.signAsync({ user, roles });

    // Gera o refresh token (7 dias)
    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      domain.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.refreshTokenService.getAccessTokenExpiration(),
    };
  }

  private MapUsertoUserDTO(user: User): UserDtoOutput {
    const output = new UserDtoOutput();
    Object.assign(
      output,
      Object.keys(output).reduce((obj, key) => {
        if (user.hasOwnProperty(key)) {
          obj[key] = user[key];
        }
        return obj;
      }, {} as UserDtoOutput),
    );
    return output;
  }

  private mapperRole(role: Role) {
    const roles: string[] = [];
    if (role.name == 'aluno') return ['aluno'];
    const notBoolean = ['id', 'createdAt', 'updatedAt', 'name'];
    Object.keys(role).forEach((key) => {
      if (!notBoolean.includes(key) && role[key]) {
        roles.push(key);
      }
    });
    return roles;
  }

  private haveLess2Hours(date: Date): boolean {
    const diff = new Date().getTime() - date.getTime();
    if (diff / 3600000 < 2) return true;
    return false;
  }

  async searchUsersByName({
    name,
  }: SearchUsersDtoInput): Promise<SearchUsersDtoOutput[]> {
    const users = await this.userRepository.searchUsersByName(name);

    return users.map((user) => ({
      id: user.id,
      name: user.useSocialName
        ? `${user.socialName} ${user.lastName}`
        : `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
    }));
  }

  /**
   * Renova o access token usando um refresh token válido
   */
  async refresh(refreshToken: string): Promise<LoginTokenDTO> {
    // Valida o refresh token e obtém o userId
    const userId =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    // Busca o usuário completo
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user || user.deletedAt != null) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    // Atualiza lastAccess (usuário está ativo)
    await this.userRepository.updateLastAcess(user);

    // Rotaciona o refresh token (segurança: gera novo e revoga o antigo)
    const newRefreshToken = await this.refreshTokenService.rotateRefreshToken(
      refreshToken,
      userId,
    );

    // Gera novo access token
    const roles = this.mapperRole(user.role);
    const userDto = this.MapUsertoUserDTO(user);

    // Verifica se o usuário possui studentCourse cadastrado
    const hasStudentCourse =
      await this.studentCourseRepository.existsByUserId(userId);
    if (hasStudentCourse && !roles.includes('visualizarMinhasInscricoes')) {
      roles.push('visualizarMinhasInscricoes');
    }

    const accessToken = await this.jwtService.signAsync({
      user: userDto,
      roles,
    });

    this.logger.log(`Access token renovado para usuário: ${user.id}`);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: this.refreshTokenService.getAccessTokenExpiration(),
    };
  }

  /**
   * Faz logout revogando o refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await this.refreshTokenService.revokeRefreshToken(refreshToken);
      this.logger.log('Logout realizado com sucesso');
    } catch (error) {
      // Mesmo que o token seja inválido, não lançamos erro no logout
      this.logger.warn(`Erro ao revogar refresh token: ${error.message}`);
    }
  }

  /**
   * Faz logout de todos os dispositivos do usuário
   */
  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
    this.logger.log(`Todos os tokens do usuário ${userId} foram revogados`);
  }

  async sendBulkEmail(
    message: string,
    subject: string,
    sendToAll?: boolean,
    userIds?: string[],
  ) {
    let users: User[];

    if (sendToAll) {
      // Buscar todos os usuários ativos
      users = await this.userRepository.findAllActive();
      this.logger.log(`Sending bulk email to all users (${users.length})`);
    } else {
      if (!userIds || userIds.length === 0) {
        throw new HttpException(
          'É necessário fornecer uma lista de IDs de usuários ou ativar sendToAll',
          HttpStatus.BAD_REQUEST,
        );
      }

      users = await Promise.all(
        userIds.map(async (id) => {
          const user = await this.userRepository.findOneBy({ id });
          if (!user) {
            throw new HttpException(
              `Usuário com ID ${id} não encontrado`,
              HttpStatus.NOT_FOUND,
            );
          }
          return user;
        }),
      );
    }

    const emails = users.map((user) => user.email);

    await this.emailService.sendBulkNotification(emails, subject, message);

    this.logger.log(
      `Bulk email sent to ${emails.length} users. Subject: ${subject}`,
    );
  }
}
