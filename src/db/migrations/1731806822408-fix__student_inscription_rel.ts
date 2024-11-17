import { MigrationInterface, QueryRunner } from 'typeorm';

export class Fix_studentInscriptionRel1731806822408
  implements MigrationInterface
{
  name = 'Fix_studentInscriptionRel1731806822408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`inscriptionCourseId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_6df9b69e0341c127de09eb986d1\` FOREIGN KEY (\`inscriptionCourseId\`) REFERENCES \`inscription_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_6df9b69e0341c127de09eb986d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`inscriptionCourseId\``,
    );
  }
}
