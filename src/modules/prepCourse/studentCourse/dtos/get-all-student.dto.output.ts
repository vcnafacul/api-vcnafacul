import { User } from 'src/modules/user/user.entity';
import { StudentCourse } from '../student-course.entity';

export class GetAllStudentDtoOutput {
  userId: string;
  studentId: string;
  urgencyPhone?: string;
  user: User;
}

export const toGetAllStudentDtoOutput = (
  entity: StudentCourse,
): GetAllStudentDtoOutput => {
  return {
    userId: entity.userId,
    studentId: entity.id,
    urgencyPhone: entity.urgencyPhone,
    user: entity.user,
  };
};
