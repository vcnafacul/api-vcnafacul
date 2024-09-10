import { User } from 'src/modules/user/user.entity';
import { StudentCourse } from '../student-course.entity';

export class GetAllStudentDtoOutput {
  id: number;
  studentId: number;
  urgencyPhone?: string;
  user: User;
}

export const toGetAllStudentDtoOutput = (
  entity: StudentCourse,
): GetAllStudentDtoOutput => {
  return {
    id: entity.userId,
    studentId: entity.id,
    urgencyPhone: entity.urgencyPhone,
    user: entity.user,
  };
};
