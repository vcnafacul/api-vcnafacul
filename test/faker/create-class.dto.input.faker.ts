import { faker } from '@faker-js/faker';
import { CreateClassDtoInput } from 'src/modules/prepCourse/class/dtos/create-class.dto.input';

export default function CreateClassDtoInputFaker(
  className?: string,
): CreateClassDtoInput {
  return {
    name: className || faker.company.name(),
    description: faker.lorem.sentence(),
    coursePeriodId: faker.string.uuid(),
  };
}
