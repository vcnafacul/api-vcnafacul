import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@Injectable()
@ValidatorConstraint()
export class RGValidator implements ValidatorConstraintInterface {
  constructor() {}

  validate(value: string): boolean {
    const rgLimpo = value.replace(/[^\dX]/g, '').toUpperCase();

    // Verificar se o tamanho é válido (entre 7 e 9 dígitos)
    if (rgLimpo.length < 7 || rgLimpo.length > 9) {
      return false;
    }

    // Verificar se é um número válido ou contém letras como 'X' (em alguns estados)
    if (!/^\d{7,8}(\d|X)$/.test(rgLimpo)) {
      return false;
    }

    // Validação simples feita. Caso necessário, adicionar validação do dígito verificador.
    // Alguns estados utilizam cálculos de dígitos verificadores, mas isso varia.

    return true;
  }
}

export const RG = (validationOptions: ValidationOptions) => {
  return (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: RGValidator,
    });
  };
};
