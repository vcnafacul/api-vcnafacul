import { Injectable } from '@nestjs/common';
import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { PartnerPrepCourseRepository } from '../partner-prep-course.repository';

@Injectable()
@ValidatorConstraint({ async: true })
export class PartnerPrepCourseExistValidator
  implements ValidatorConstraintInterface
{
  constructor(private readonly repository: PartnerPrepCourseRepository) {}

  async validate(value: any): Promise<boolean> {
    const PartnerPrepCourse = await this.repository.findOneBy({
      id: value,
    });
    return !!PartnerPrepCourse;
  }
}

export const PartnerPrepCourseExist = (
  validationOptions: ValidationOptions,
) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: PartnerPrepCourseExistValidator,
    });
  };
};
