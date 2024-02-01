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
  visualizarQuestao: boolean;

  @IsBoolean()
  criarQuestao: boolean;

  @IsBoolean()
  validarQuestao: boolean;

  @IsBoolean()
  uploadNews: boolean;

  @IsBoolean()
  visualizarProvas: boolean;

  @IsBoolean()
  cadastrarProvas: boolean;

  @IsBoolean()
  visualizarDemanda: boolean;

  @IsBoolean()
  uploadDemanda: boolean;

  @IsBoolean()
  validarDemanda: boolean;

  @IsBoolean()
  gerenciadorDemanda: boolean;
}
