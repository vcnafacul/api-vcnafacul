import { MigrationInterface, QueryRunner } from 'typeorm';

export class ObservacaoDaPresenca1791075353124 implements MigrationInterface {
  name = 'ObservacaoDaPresenca1791075353124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD \`observation\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD \`observation_at\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD \`observation_by\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` ADD CONSTRAINT \`FK_726bbd8913227e8b3bb08a99e17\` FOREIGN KEY (\`observation_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP FOREIGN KEY \`FK_726bbd8913227e8b3bb08a99e17\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP COLUMN \`observation_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP COLUMN \`observation_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_attendance\` DROP COLUMN \`observation\``,
    );
  }
}
