import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CollaboratorFrenteRepository } from '../prepCourse/collaborator/collaborator-frente.repository';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { StudentAttendanceRepository } from '../prepCourse/attendance/studentAttendance/student-attendance.repository';
import { StudentCourseRepository } from '../prepCourse/studentCourse/student-course.repository';
import { FrenteProxyService } from '../simulado/frente/frente.service';
import { CollaboratorDashboardDtoOutput } from './dtos/collaborator-dashboard.dto.output';
import { StudentDashboardDtoOutput } from './dtos/student-dashboard.dto.output';

@Injectable()
export class DashboardService {
  constructor(
    private readonly studentCourseRepo: StudentCourseRepository,
    private readonly studentAttendanceRepo: StudentAttendanceRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly collaboratorFrenteRepository: CollaboratorFrenteRepository,
    private readonly frenteProxyService: FrenteProxyService,
  ) {}

  async getStudentDashboard(
    userId: string,
  ): Promise<StudentDashboardDtoOutput[]> {
    const students =
      await this.studentCourseRepo.findAllEnrolledWithDetails(userId);

    if (!students.length) {
      return [];
    }

    return Promise.all(
      students.map(async (student) => {
        const { presencas, faltas } =
          await this.studentAttendanceRepo.countByStudentCourseId(student.id);

        const total = presencas + faltas;
        const percentual =
          total > 0 ? Math.round((presencas / total) * 100) : 0;

        const coursePeriod = student.class?.coursePeriod;
        const periodo = coursePeriod
          ? `${coursePeriod.name} ${coursePeriod.year}`
          : null;

        return {
          cursinho: {
            name: student.partnerPrepCourse?.geo?.name ?? '',
            logo: student.partnerPrepCourse?.logo ?? null,
          },
          matricula: student.cod_enrolled ?? null,
          turma: student.class?.name ?? null,
          periodo,
          frequencia: { presencas, faltas, percentual },
        };
      }),
    );
  }

  async getCollaboratorDashboard(
    userId: string,
  ): Promise<CollaboratorDashboardDtoOutput> {
    const collaborator =
      await this.collaboratorRepository.findActiveByUserIdWithDetails(userId);

    if (!collaborator) {
      throw new HttpException(
        'Colaborador não encontrado ou inativo',
        HttpStatus.NOT_FOUND,
      );
    }

    const frenteRecords =
      await this.collaboratorFrenteRepository.findByCollaboratorId(
        collaborator.id,
      );

    const frenteResults = await Promise.all(
      frenteRecords.map(async (record) => {
        try {
          const frente = await this.frenteProxyService.getById(record.frenteId) as { nome: string };
          return { id: record.frenteId, name: frente.nome };
        } catch {
          return null;
        }
      }),
    );

    const frentes = frenteResults.filter(
      (f): f is { id: string; name: string } => f !== null,
    );

    return {
      cursinho: {
        name: collaborator.partnerPrepCourse?.geo?.name ?? '',
        logo: collaborator.partnerPrepCourse?.logo ?? null,
      },
      frentes,
    };
  }
}
