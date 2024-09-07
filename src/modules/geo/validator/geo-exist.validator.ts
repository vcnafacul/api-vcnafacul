import {
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { GeoRepository } from '../geo.repository';

@Injectable()
@ValidatorConstraint({ async: true })
export class GeoExistValidator implements ValidatorConstraintInterface {
  constructor(private readonly geoRepository: GeoRepository) {}

  async validate(value: any): Promise<boolean> {
    const geo = await this.geoRepository.findOneBy({ id: value });
    return !!geo;
  }
}

export const GeoExist = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: GeoExistValidator,
    });
  };
};
