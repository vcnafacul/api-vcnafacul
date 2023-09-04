import { Injectable } from '@nestjs/common';
import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { RoleRepository } from 'src/modules/role/role.repository';

@Injectable()
@ValidatorConstraint({ async: true })
export class RoleExistValidator implements ValidatorConstraintInterface {
  constructor(private readonly roleRepository: RoleRepository) {}

  async validate(value: any): Promise<boolean> {
    const role = await this.roleRepository.findOneBy({ id: value });
    return !!role;
  }
}

export const RoleExist = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: RoleExistValidator,
    });
  };
};
