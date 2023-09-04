import { Injectable } from '@nestjs/common';
import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { UserRepository } from '../user.repository';

@Injectable()
@ValidatorConstraint({ async: true })
export class EmailExistValidator implements ValidatorConstraintInterface {
  constructor(private readonly userRepository: UserRepository) {}
  async validate(value: any): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ email: value });
    return !!user;
  }
}

export const EmailExist = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: EmailExistValidator,
    });
  };
};
