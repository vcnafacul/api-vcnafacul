import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { RoleExist } from '../validator/role-exist.validator';

export class CreateRoleDtoInput {
  @IsString()
  name: string;

  @IsBoolean()
  base: boolean;

  @IsString()
  @RoleExist({ message: 'role not exists' })
  @IsOptional()
  roleBase?: string;

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

  @IsBoolean()
  gerenciarProcessoSeletivo: boolean;

  @IsBoolean()
  gerenciarColaboradores: boolean;

  @IsBoolean()
  gerenciarTurmas: boolean;

  @IsBoolean()
  gerenciarEstudantes: boolean;

  @IsBoolean()
  gerenciarPermissoesCursinho: boolean;

  @IsBoolean()
  visualizarTurmas: boolean;

  @IsBoolean()
  visualizarEstudantes: boolean;
}
