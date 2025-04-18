import { faker } from '@faker-js/faker';
import { CreateClassDtoInput } from 'src/modules/prepCourse/class/dtos/create-class.dto.input';

export default function CreateClassDtoInputFaker(
  className?: string,
): CreateClassDtoInput {
  return {
    name: className || faker.company.name(),
    description: faker.lorem.sentence(),
    year: faker.number.int({ min: 2000, max: new Date().getFullYear() }),
    startDate: faker.date.recent(),
    endDate: faker.date.future(),
  };
}
