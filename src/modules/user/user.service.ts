import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { CreateUserDtoInput } from './dto/create.dto.input';
import { RoleRepository } from '../role/role.repository';
import { LoginDtoInput } from './dto/login.dto.input';
import { UserDtoOutput } from './dto/user.dto.output';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../role/role.entity';
import { UpdateUserDTOInput } from './dto/update.dto.input';
import { EmailService } from 'src/shared/services/email.service';
import { ResetPasswordDtoInput } from './dto/reset-password.dto.input';
import { LoginTokenDTO } from './dto/login-token.dto.input';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async createUser(userDto: CreateUserDtoInput): Promise<User> {
    try {
      const newUser = this.convertDtoToDomain(userDto);
      const role = await this.roleRepository.findOneBy({ name: 'aluno' });
      if (!role) {
        throw new HttpException('role not found', HttpStatus.BAD_REQUEST);
      }
      return await this.userRepository.create(newUser, role);
    } catch (error) {
      if (error.code === '23505') {
        // código de erro para violação de restrição única no PostgreSQL
        throw new HttpException('Email already exist', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }

  async signIn(loginInput: LoginDtoInput): Promise<LoginTokenDTO> {
    const bcrypt = await import('bcrypt');
    const userFullInfo = await this.userRepository.findByEmail(
      loginInput.email,
    );
    if (!userFullInfo || userFullInfo.deletedAt != null) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (!(await bcrypt.compare(loginInput.password, userFullInfo?.password))) {
      throw new HttpException('password invalid', HttpStatus.CONFLICT);
    }
    const roles = this.mapperRole(userFullInfo.userRole.role);
    const user = this.MapUsertoUserDTO(userFullInfo);
    return {
      access_token: await this.jwtService.signAsync({ user, roles }),
      status: HttpStatus.OK,
    };
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new HttpException(
        `User with id ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  async findAll() {
    return this.MapListUsertoUserDTO(await this.userRepository.findAll());
  }

  async update(updateUser: UpdateUserDTOInput, userId: number) {
    const user = await this.userRepository.findUserById(userId);

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

  async deleteUser(id: number) {
    const user = await this.findUserById(id);
    await this.userRepository.deleteUser(user);
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    const token = await this.jwtService.signAsync(
      { id: user.id },
      { expiresIn: '2h' },
    );
    await this.emailService.sendForgotPasswordMail(
      user.firstName,
      email,
      token,
    );
  }

  async reset(resetPassword: ResetPasswordDtoInput, userId: number) {
    const user = await this.findUserById(userId);
    user.password = resetPassword.password;
    await this.userRepository.update(user);
  }

  async getvalidateGeo(): Promise<string[]> {
    return (await this.userRepository.getValidatorGeo()).map(
      (user) => user.email,
    );
  }

  private convertDtoToDomain(userDto: CreateUserDtoInput): User {
    const newUser = new User();
    return Object.assign(userDto, newUser);
  }

  private MapListUsertoUserDTO(users: User[]): UserDtoOutput[] {
    return users.map((user) => this.MapUsertoUserDTO(user));
  }

  private MapUsertoUserDTO(user: User): UserDtoOutput {
    const output = new UserDtoOutput();
    return Object.assign(user, output);
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
}
