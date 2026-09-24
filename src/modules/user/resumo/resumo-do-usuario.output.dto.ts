import { ApiProperty } from '@nestjs/swagger';
import { InscricaoDoResumo } from './resumo-do-usuario.regras';

/**
 * Quem é a pessoa na plataforma (card 04 de `tela-de-usuarios`).
 *
 * ⚠️ **Só o que ajuda a identificar e decidir a função** — nada de documento,
 * endereço completo ou responsável legal. É para o admin da plataforma saber
 * QUEM é; a ficha do estudante continua no cursinho.
 */
export class ResumoDoUsuarioDtoOutput {
  @ApiProperty()
  conta: {
    id: string;
    nome: string;
    nomeSocial: string | null;
    usaNomeSocial: boolean;
    email: string;
    telefone: string;
    cidade: string;
    uf: string;
    cadastradoEm: Date;
    ultimoAcesso: Date | null;
    /** `emailConfirmSended === null` — o default da coluna é "aguardando". */
    emailConfirmado: boolean;
    desativada: boolean;
    funcao: { id: string; nome: string } | null;
  };

  /** `null` para quem não é colaborador (`Collaborator` é 1:1 hoje). */
  @ApiProperty({ nullable: true })
  colaborador: {
    cursinho: { id: string; nome: string } | null;
    ativo: boolean;
    desde: Date;
  } | null;

  @ApiProperty()
  estudante: {
    atual: InscricaoDoResumo[];
    historico: InscricaoDoResumo[];
  };
}
