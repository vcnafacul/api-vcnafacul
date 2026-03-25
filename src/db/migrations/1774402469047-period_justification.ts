import { MigrationInterface, QueryRunner } from 'typeorm';

export class PeriodJustification1774402469047 implements MigrationInterface {
  name = 'PeriodJustification1774402469047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`period_justification\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`start_date\` date NOT NULL, \`end_date\` date NOT NULL, \`justification\` varchar(255) NOT NULL, \`student_course_id\` varchar(36) NULL, \`created_by_id\` varchar(36) NULL, INDEX \`IDX_c7ca1ed655d373cdd874eb88bc\` (\`student_course_id\`, \`start_date\`, \`end_date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`period_justification\` ADD CONSTRAINT \`FK_70bbeeb28d2e7fdfb8d62bf2b9c\` FOREIGN KEY (\`student_course_id\`) REFERENCES \`student_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`period_justification\` ADD CONSTRAINT \`FK_69ba47cf27dab64ccf7da1c0818\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`collaborators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`period_justification\` DROP FOREIGN KEY \`FK_69ba47cf27dab64ccf7da1c0818\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`period_justification\` DROP FOREIGN KEY \`FK_70bbeeb28d2e7fdfb8d62bf2b9c\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c7ca1ed655d373cdd874eb88bc\` ON \`period_justification\``,
    );
    await queryRunner.query(`DROP TABLE \`period_justification\``);
  }
}
