import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFrenteProxyDtoInput {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  materia?: string;
}
