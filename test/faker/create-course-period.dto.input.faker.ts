import { faker } from '@faker-js/faker';
import { CreateCoursePeriodDtoInput } from 'src/modules/prepCourse/coursePeriod/dtos/create-course-period.dto.input';

export function CreateCoursePeriodDtoInputFaker(): CreateCoursePeriodDtoInput {
  const year = faker.number.int({
    min: 2020,
    max: new Date().getFullYear() + 1,
  });
  const startDate = faker.date.between({
    from: new Date(year, 0, 1),
    to: new Date(year, 6, 31),
  });
  const endDate = faker.date.between({
    from: startDate,
    to: new Date(year, 11, 31),
  });

  return {
    name: `Período ${year}`,
    startDate: startDate,
    endDate: endDate,
  };
}
