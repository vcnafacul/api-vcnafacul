import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { UserRepository } from '../user.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
@ValidatorConstraint({ async: true })
export class EmailUniqueValidator implements ValidatorConstraintInterface {
  constructor(private readonly userRepository: UserRepository) {}

  async validate(value: any): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ email: value });
    return !user;
  }
}

export const EmailUnique = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: EmailUniqueValidator,
    });
  };
};
