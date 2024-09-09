import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { validateUF } from 'validations-br';

@Injectable()
@ValidatorConstraint()
export class UFValidator implements ValidatorConstraintInterface {
  constructor() {}

  validate(value: string): boolean {
    return validateUF(value);
  }
}

export const UF = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: UFValidator,
    });
  };
};
