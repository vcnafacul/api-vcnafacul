import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushRecalculoNota1792273244109 implements MigrationInterface {
  name = 'PushRecalculoNota1792273244109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` ADD \`acertos_antes\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` ADD \`total_antes\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` ADD \`acertos_depois\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` ADD \`total_depois\` int NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` DROP COLUMN \`total_depois\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` DROP COLUMN \`acertos_depois\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` DROP COLUMN \`total_antes\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`push_recalculo_anulacao\` DROP COLUMN \`acertos_antes\``,
    );
  }
}
