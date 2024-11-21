import { Status } from 'src/modules/simulado/enum/status.enum';
import { Gender } from 'src/modules/user/enum/gender';

export class GetSubscribersDtoOutput {
  //pt-br
  id: string;
  cadastrado_em: Date;
  isento: boolean;
  matriculado: boolean;
  convocado: boolean;
  convocado_em: Date;
  convocado_antes: boolean;
  lista_de_espera: boolean;
  deferido: Status;
  email: string;
  cpf: string;
  rg: string;
  uf: string;
  telefone_emergencia: string;
  socioeconomic: string;
  whatsapp: string;
  nome: string;
  sobrenome: string;
  nome_social: string;
  data_nascimento: Date;
  genero: Gender;
  telefone: string;
  bairro: string;
  rua: string;
  numero: number;
  complemento: string;
  CEP: string;
  cidade: string;
  estado: string;
  nome_guardiao_legal: string;
  telefone_guardiao_legal: string;
  rg_guardiao_legal: string;
  uf_guardiao_legal: string;
  cpf_guardiao_legal: string;
  parentesco_guardiao_legal: string;
}
