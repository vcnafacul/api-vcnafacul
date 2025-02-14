import { MigrationInterface, QueryRunner } from 'typeorm';

export class Class1739376592959 implements MigrationInterface {
  name = 'Class1739376592959';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`classes\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`year\` int NOT NULL, \`startDate\` datetime NOT NULL, \`endDate\` datetime NOT NULL, \`partner_prep_course_id\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`classes_collaborators\` (\`class_id\` varchar(36) NOT NULL, \`collaborator_id\` varchar(36) NOT NULL, INDEX \`IDX_9dbcbd16fddbdaade4550a2a11\` (\`class_id\`), INDEX \`IDX_6e3240bce0499cc1bc8e262992\` (\`collaborator_id\`), PRIMARY KEY (\`class_id\`, \`collaborator_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`classId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_turmas\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_d6e69fccad51b8e11bb036a5522\` FOREIGN KEY (\`classId\`) REFERENCES \`classes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` ADD CONSTRAINT \`FK_b37b924b873619cb72a96053737\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes_collaborators\` ADD CONSTRAINT \`FK_9dbcbd16fddbdaade4550a2a11b\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes_collaborators\` ADD CONSTRAINT \`FK_6e3240bce0499cc1bc8e262992a\` FOREIGN KEY (\`collaborator_id\`) REFERENCES \`collaborators\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`classes_collaborators\` DROP FOREIGN KEY \`FK_6e3240bce0499cc1bc8e262992a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes_collaborators\` DROP FOREIGN KEY \`FK_9dbcbd16fddbdaade4550a2a11b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`classes\` DROP FOREIGN KEY \`FK_b37b924b873619cb72a96053737\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_d6e69fccad51b8e11bb036a5522\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_turmas\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`classId\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6e3240bce0499cc1bc8e262992\` ON \`classes_collaborators\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9dbcbd16fddbdaade4550a2a11\` ON \`classes_collaborators\``,
    );
    await queryRunner.query(`DROP TABLE \`classes_collaborators\``);
    await queryRunner.query(`DROP TABLE \`classes\``);
  }
}
