import { faker } from '@faker-js/faker';
import { CreateInscriptionCourseInput } from 'src/modules/prepCourse/InscriptionCourse/dtos/create-inscription-course.dto.input';

export function CreateInscriptionCourseDTOInputFaker(): CreateInscriptionCourseInput {
  return {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    startDate: faker.date.recent(),
    endDate: faker.date.future(),
    expectedOpening: faker.number.int({ min: 1, max: 100 }),
    requestDocuments: false,
  };
}
