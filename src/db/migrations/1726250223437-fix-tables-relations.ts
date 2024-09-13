import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTablesRelations1726250223437 implements MigrationInterface {
  name = 'FixTablesRelations1726250223437';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`student_course_inscription_courses_inscription_course\` (\`studentCourseId\` int NOT NULL, \`inscriptionCourseId\` int NOT NULL, INDEX \`IDX_3e2827c9ad4edac0a93ece0f59\` (\`studentCourseId\`), INDEX \`IDX_1d2cc2da58535f4fd95fa93eb2\` (\`inscriptionCourseId\`), PRIMARY KEY (\`studentCourseId\`, \`inscriptionCourseId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_inscricoes_cursinho_parceiro\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP FOREIGN KEY \`FK_245c29cc87a39e7d3ef7f39e47e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` CHANGE \`partner_prep_course_id\` \`partner_prep_course_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD CONSTRAINT \`FK_245c29cc87a39e7d3ef7f39e47e\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` ADD CONSTRAINT \`FK_3e2827c9ad4edac0a93ece0f590\` FOREIGN KEY (\`studentCourseId\`) REFERENCES \`student_course\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` ADD CONSTRAINT \`FK_1d2cc2da58535f4fd95fa93eb20\` FOREIGN KEY (\`inscriptionCourseId\`) REFERENCES \`inscription_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` DROP FOREIGN KEY \`FK_1d2cc2da58535f4fd95fa93eb20\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course_inscription_courses_inscription_course\` DROP FOREIGN KEY \`FK_3e2827c9ad4edac0a93ece0f590\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP FOREIGN KEY \`FK_245c29cc87a39e7d3ef7f39e47e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` CHANGE \`partner_prep_course_id\` \`partner_prep_course_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD CONSTRAINT \`FK_245c29cc87a39e7d3ef7f39e47e\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_inscricoes_cursinho_parceiro\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1d2cc2da58535f4fd95fa93eb2\` ON \`student_course_inscription_courses_inscription_course\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3e2827c9ad4edac0a93ece0f59\` ON \`student_course_inscription_courses_inscription_course\``,
    );
    await queryRunner.query(
      `DROP TABLE \`student_course_inscription_courses_inscription_course\``,
    );
  }
}
