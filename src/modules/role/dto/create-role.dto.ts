import { IsBoolean, IsString } from 'class-validator';

export class CreateRoleDtoInput {
  @IsString()
  name: string;

  @IsBoolean()
  validarCursinho: boolean;

  @IsBoolean()
  alterarPermissao: boolean;

  @IsBoolean()
  criarSimulado: boolean;

  @IsBoolean()
  bancoQuestoes: boolean;

  @IsBoolean()
  uploadNews: boolean;
}
