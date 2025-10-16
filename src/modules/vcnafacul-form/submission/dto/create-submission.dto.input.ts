import { SocioeconomicAnswer } from 'src/modules/prepCourse/studentCourse/types/student-course-full';

export interface CreateSubmissionDtoInput {
  inscriptionId: string;
  userId: string;
  studentId: string;
  name: string;
  email: string;
  birthday: Date;
  answers: SocioeconomicAnswer[];
}
