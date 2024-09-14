import { Injectable } from '@nestjs/common';
import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { InscriptionCourseRepository } from '../inscription-course.repository';

@Injectable()
@ValidatorConstraint({ async: true })
export class InscriptionCourseExistValidator
  implements ValidatorConstraintInterface
{
  constructor(
    private readonly inscriptionCourseRepository: InscriptionCourseRepository,
  ) {}

  async validate(value: any): Promise<boolean> {
    const InscriptionCourse = await this.inscriptionCourseRepository.findOneBy({
      id: value,
    });
    return !InscriptionCourse;
  }
}

export const InscriptionCourseExist = (
  validationOptions: ValidationOptions,
) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: InscriptionCourseExistValidator,
    });
  };
};
