import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { validateCPF } from 'validations-br';

@Injectable()
@ValidatorConstraint()
export class CPFValidator implements ValidatorConstraintInterface {
  constructor() {}

  validate(value: string): boolean {
    return validateCPF(value);
  }
}

export const CPF = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: CPFValidator,
    });
  };
};
