import { ValidatorOptions, registerDecorator } from 'class-validator';

export const registerMyDecorator = (
  classValidator: any,
  validationOptions: ValidatorOptions,
) => {
  (obj: object, props: string) => {
    registerDecorator({
      target: obj.constructor,
      propertyName: props,
      options: validationOptions,
      constraints: [],
      validator: classValidator,
    });
  };
};
