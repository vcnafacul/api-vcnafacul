import { DocumentStudentDtoOutput } from '../../studentCourse/dtos/document-student.dto.output';
import { LogStudent } from '../../studentCourse/log-student/log-student.entity';

export class GetHistoricoInscritoDtoOutput {
  logs: LogStudent[];
  documents: DocumentStudentDtoOutput[];
}
