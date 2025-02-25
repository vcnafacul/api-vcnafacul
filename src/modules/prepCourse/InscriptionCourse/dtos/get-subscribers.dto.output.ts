import { DocumentStudentDtoOutput } from '../../studentCourse/dtos/document-student.dto.output';
import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import { LogStudent } from '../../studentCourse/log-student/log-student.entity';

export class GetSubscribersDtoOutput {
  //pt-br
  id: string;
  cadastrado_em: Date;
  isento: string;
  convocar: string;
  data_convocacao: Date;
  data_limite_convocacao: Date;
  lista_de_espera: string;
  status: StatusApplication;
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
  genero: string;
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
  logs: LogStudent[];
  documents: DocumentStudentDtoOutput[];
  photo: string;
  areas_de_interesse?: string;
  cursos_selecionados?: string;
}
