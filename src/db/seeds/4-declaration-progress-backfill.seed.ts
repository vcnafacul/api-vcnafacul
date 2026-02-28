import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class DeclarationProgressBackfillSeedService {
  private readonly logger = new Logger(
    DeclarationProgressBackfillSeedService.name,
  );

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async seed() {
    this.logger.log(
      'Iniciando backfill de progresso de declaração de interesse...',
    );

    const statuses = [
      'Matriculado',
      'Declarou Interesse',
      'Matrícula não confirmada',
      'Matrícula Cancelada',
      'Matrícula Encerrada',
    ];

    const result = await this.entityManager.query(
      `UPDATE \`student_course\`
       SET \`documents_done\` = 1, \`photo_done\` = 1, \`survey_done\` = 1
       WHERE \`applicationStatus\` IN (?)
         AND (\`documents_done\` = 0 OR \`photo_done\` = 0 OR \`survey_done\` = 0)`,
      [statuses],
    );

    const affected = result?.affectedRows ?? 0;
    this.logger.log(
      `Backfill concluído: ${affected} estudante(s) atualizado(s)`,
    );
  }
}
