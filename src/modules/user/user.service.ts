import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GetAllDtoOutput } from 'src/shared/dtos/get-all.dto.output';
import { BaseService } from 'src/shared/modules/base/base.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { Role } from '../role/role.entity';
import { RoleRepository } from '../role/role.repository';
import { CreateUserDtoInput } from './dto/create.dto.input';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { LoginTokenDTO } from './dto/login-token.dto.input';
import { LoginDtoInput } from './dto/login.dto.input';
import { ResetPasswordDtoInput } from './dto/reset-password.dto.input';
import { UpdateUserDTOInput } from './dto/update.dto.input';
import { UserDtoOutput } from './dto/user.dto.output';
import { UserWithRoleName } from './dto/userWithRoleName';
import { CreateFlow } from './enum/create-flow';
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
    private readonly discordWebhook: DiscordWebhook,
    private readonly envService: EnvService,
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

  // async createUser(userDto: CreateUserDtoInput) {
  //   try {
  //     if (userDto.password !== userDto.password_confirmation) {
  //       throw new HttpException(
  //         'password and password_confirmation do not match',
  //         HttpStatus.CONFLICT,
  //       );
  //     }
  //     const newUser = this.convertDtoToDomain(userDto);
  //     const role = await this.roleRepository.findOneBy({ name: 'aluno' });
  //     if (!role) {
  //       throw new HttpException('role not found', HttpStatus.BAD_REQUEST);
  //     }
  //     newUser.role = role;
  //     if (userDto.socialName) newUser.useSocialName = true;
  //     const user = await this.userRepository.create(newUser);
  //     this.logger.log('User created: ' + user.id + ' - ' + user.email);
  //     return user;
  //   } catch (error) {
  //     const env = this.envService.get('NODE_ENV');
  //     if (env !== 'test') {
  //       await this.discordWebhook.sendMessage(
  //         `Erro ao criar usuário: ${error}`,
  //       );
  //     }
  //     this.logger.error(`Erro ao criar usuário: ${error}`);
  //     if (error.code === '23505') {
  //       throw new HttpException('Email already exist', HttpStatus.CONFLICT);
  //     }
  //     throw error;
  //   }
  // }

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
        { expiresIn: '2h' },
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
    }
    return userDto;
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

  private convertDtoToDomain(userDto: CreateUserDtoInput): User {
    const newUser = new User();
    return Object.assign(newUser, userDto) as User;
  }

  private async getAccessToken(domain: User) {
    const roles = this.mapperRole(domain.role);
    const user = this.MapUsertoUserDTO(domain);
    return {
      access_token: await this.jwtService.signAsync({ user, roles }),
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
}
