import { PerfilGoogle } from './google-auth.regras';

/** Cookie que guarda o token de cadastro entre o callback e o 2º passo. */
export const COOKIE_DO_CADASTRO = 'google_cadastro';
export const VALIDADE_DO_CADASTRO_MS = 30 * 60 * 1000;

/** O que o token de cadastro carrega — nada é gravado no banco até o 2º passo. */
export interface CadastroPendente {
  perfil: PerfilGoogle;
  voltar: string;
  /** O token do convite de colaborador, se veio de um (card 05). */
  convite?: string;
}
