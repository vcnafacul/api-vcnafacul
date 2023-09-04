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

  async update(updateUser: UpdateUserDTOInput) {
    const user = await this.userRepository.findUserById(updateUser.id);

    let isChanged = false;

    if (updateUser.nome != null) {
      user.firstName = updateUser.nome;
      isChanged = true;
    }

    if (updateUser.sobrenome != null) {
      user.lastName = updateUser.sobrenome;
      isChanged = true;
    }

    if (updateUser.telefone != null) {
      user.phone = updateUser.telefone;
      isChanged = true;
    }

    if (updateUser.genero != null) {
      user.gender = updateUser.genero;
      isChanged = true;
    }

    if (updateUser.nascimento != null) {
      user.birthday = updateUser.nascimento;
      isChanged = true;
    }

    if (updateUser.estado != null) {
      user.state = updateUser.estado;
      isChanged = true;
    }

    if (updateUser.cidade != null) {
      user.phone = updateUser.cidade;
      isChanged = true;
    }

    if (updateUser.sobre != null) {
      user.about = updateUser.sobre;
      isChanged = true;
    }

    if (isChanged) {
      // Salve as alterações do usuário.
      await this.userRepository.update(user);
    }
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

  async reset(resetPassword: ResetPasswordDtoInput, userToken: User) {
    const user = await this.findUserById(userToken.id);
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

    newUser.email = userDto.email;
    newUser.password = userDto.password;
    newUser.firstName = userDto.nome;
    newUser.lastName = userDto.sobrenome;
    newUser.phone = userDto.telefone;
    newUser.gender = userDto.genero;
    newUser.birthday = userDto.nascimento;
    newUser.state = userDto.estado;
    newUser.city = userDto.cidade;

    return newUser;
  }

  private MapListUsertoUserDTO(users: User[]): UserDtoOutput[] {
    return users.map((user) => this.MapUsertoUserDTO(user));
  }

  private MapUsertoUserDTO(user: User): UserDtoOutput {
    const output = new UserDtoOutput();
    output.id = user.id;
    output.firstName = user.firstName;
    output.lastName = user.lastName;
    output.email = user.email;
    output.phone = user.phone;
    output.gender = user.gender;
    output.birthday = user.birthday;
    output.state = user.state;
    output.city = user.city;

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
}
