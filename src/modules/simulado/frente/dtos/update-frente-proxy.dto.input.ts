import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFrenteProxyDtoInput {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  name?: string;
}
