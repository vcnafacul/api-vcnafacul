import { faker } from '@faker-js/faker';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { Gender } from 'src/modules/user/enum/gender';

export function CreateUserDtoInputFaker(): CreateUserDtoInput {
  const password = faker.internet.password();
  return {
    email: faker.internet.email(),
    password: password,
    password_confirmation: password,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    birthday: faker.date.birthdate(),
    state: faker.location.state(),
    city: faker.location.city(),
    gender: Gender.Other,
    about: faker.lorem.paragraph(),
    lgpd: true,
  };
}
