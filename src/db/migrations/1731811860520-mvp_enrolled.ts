import { MigrationInterface, QueryRunner } from 'typeorm';

export class MvpEnrolled1731811860520 implements MigrationInterface {
  name = 'MvpEnrolled1731811860520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_6df9b69e0341c127de09eb986d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`prev\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`next\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`selectEnrolled\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`selectEnrolledAt\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`alreadySelectEnrolled\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`waitingList\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`isFree\` tinyint NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`applicationStatus\` int NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD \`enrolledId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`prev\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`next\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`head\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`tail\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`lenght\` int NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` CHANGE \`description\` \`description\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_d9ef1776a85fc9d7d9a74658775\` FOREIGN KEY (\`inscriptionCourseId\`) REFERENCES \`inscription_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_83d46ce018a24c0c8dadc7a92f7\` FOREIGN KEY (\`enrolledId\`) REFERENCES \`inscription_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_83d46ce018a24c0c8dadc7a92f7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP FOREIGN KEY \`FK_d9ef1776a85fc9d7d9a74658775\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` CHANGE \`description\` \`description\` varchar(255) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`lenght\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`tail\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`head\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`next\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`prev\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`enrolledId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`applicationStatus\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`isFree\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`waitingList\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`alreadySelectEnrolled\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`selectEnrolledAt\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`selectEnrolled\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`next\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP COLUMN \`prev\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD CONSTRAINT \`FK_6df9b69e0341c127de09eb986d1\` FOREIGN KEY (\`inscriptionCourseId\`) REFERENCES \`inscription_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
