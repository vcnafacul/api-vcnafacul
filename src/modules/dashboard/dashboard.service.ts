import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CollaboratorFrenteRepository } from '../prepCourse/collaborator/collaborator-frente.repository';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { StudentAttendanceRepository } from '../prepCourse/attendance/studentAttendance/student-attendance.repository';
import { StudentCourseRepository } from '../prepCourse/studentCourse/student-course.repository';
import { FrenteProxyService } from '../simulado/frente/frente.service';
import { QuestaoService } from '../simulado/questao/questao.service';
import { CacheService } from '../../shared/modules/cache/cache.service';
import { CollaboratorDashboardDtoOutput } from './dtos/collaborator-dashboard.dto.output';
import { StudentDashboardDtoOutput } from './dtos/student-dashboard.dto.output';
import { QuestoesPendentesDashboardDtoOutput } from './dtos/questoes-pendentes-dashboard.dto.output';

@Injectable()
export class DashboardService {
  constructor(
    private readonly studentCourseRepo: StudentCourseRepository,
    private readonly studentAttendanceRepo: StudentAttendanceRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly collaboratorFrenteRepository: CollaboratorFrenteRepository,
    private readonly frenteProxyService: FrenteProxyService,
    private readonly questaoService: QuestaoService,
    private readonly cache: CacheService,
  ) {}

  async getStudentDashboard(
    userId: string,
  ): Promise<StudentDashboardDtoOutput[]> {
    return this.cache.wrap(
      `dashboard:student:${userId}`,
      async () => {
        const students =
          await this.studentCourseRepo.findAllEnrolledWithDetails(userId);

        if (!students.length) {
          return [];
        }

        return Promise.all(
          students.map(async (student) => {
            const { presencas, faltas } =
              await this.studentAttendanceRepo.countByStudentCourseId(
                student.id,
              );

            const total = presencas + faltas;
            const percentual =
              total > 0 ? Math.round((presencas / total) * 100) : 0;

            const coursePeriod = student.class?.coursePeriod;
            const periodo = coursePeriod
              ? `${coursePeriod.name} ${coursePeriod.year}`
              : null;

            const thumbnail = student.partnerPrepCourse?.thumbnail;
            const logo = thumbnail
              ? `data:image/webp;base64,${thumbnail.toString('base64')}`
              : null;

            return {
              cursinho: {
                name: student.partnerPrepCourse?.geo?.name ?? '',
                logo,
              },
              matricula: student.cod_enrolled ?? null,
              turma: student.class?.name ?? null,
              periodo,
              frequencia: { presencas, faltas, percentual },
            };
          }),
        );
      },
      24 * 60 * 60 * 1000, // 1d
    );
  }

  async invalidateStudentDashboard(userId: string): Promise<void> {
    await this.cache.del(`dashboard:student:${userId}`);
  }

  async getCollaboratorDashboard(
    userId: string,
  ): Promise<CollaboratorDashboardDtoOutput> {
    return this.cache.wrap(
      `dashboard:collab:${userId}`,
      async () => {
        const collaborator =
          await this.collaboratorRepository.findActiveByUserIdWithDetails(
            userId,
          );

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
              const frente = (await this.frenteProxyService.getById(
                record.frenteId,
              )) as { nome: string };
              return { id: record.frenteId, name: frente.nome };
            } catch {
              return null;
            }
          }),
        );

        const frentes = frenteResults.filter(
          (f): f is { id: string; name: string } => f !== null,
        );

        const thumbnail = collaborator.partnerPrepCourse?.thumbnail;
        const logo = thumbnail
          ? `data:image/webp;base64,${thumbnail.toString('base64')}`
          : null;

        return {
          cursinho: {
            name: collaborator.partnerPrepCourse?.geo?.name ?? '',
            logo,
          },
          frentes,
        };
      },
      7 * 24 * 60 * 60 * 1000, // 7d
    );
  }

  async invalidateCollaboratorDashboard(userId: string): Promise<void> {
    await this.cache.del(`dashboard:collab:${userId}`);
  }

  async getQuestoesPendentes(
    userId: string,
  ): Promise<QuestoesPendentesDashboardDtoOutput> {
    return this.cache.wrap(
      `dashboard:questoes-pendentes:${userId}`,
      async () => {
        const collaborator =
          await this.collaboratorRepository.findActiveByUserId(userId);

        let materiaIds: string[] | undefined;
        if (collaborator) {
          const frenteRecords =
            await this.collaboratorFrenteRepository.findByCollaboratorId(
              collaborator.id,
            );
          if (frenteRecords.length > 0) {
            const materiaResults = await Promise.all(
              frenteRecords.map(async (record) => {
                try {
                  const frente = (await this.frenteProxyService.getById(
                    record.frenteId,
                  )) as { materia: string };
                  return frente.materia;
                } catch {
                  return null;
                }
              }),
            );
            const uniqueIds = [
              ...new Set(materiaResults.filter((id): id is string => !!id)),
            ];
            if (uniqueIds.length > 0) {
              materiaIds = uniqueIds;
            }
          }
        }

        return await this.questaoService.getPendingByMateria(materiaIds);
      },
      5 * 60 * 1000, // 5min
    );
  }
}
