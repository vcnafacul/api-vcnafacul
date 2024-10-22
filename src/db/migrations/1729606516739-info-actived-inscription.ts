import { MigrationInterface, QueryRunner } from 'typeorm';

export class InfoActivedInscription1729606516739 implements MigrationInterface {
  name = 'InfoActivedInscription1729606516739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_20cea178b87e8475b734004f9e\` ON \`student_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`actived\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`actived\` int NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` DROP COLUMN \`actived\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inscription_course\` ADD \`actived\` tinyint NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_20cea178b87e8475b734004f9e\` ON \`student_course\` (\`legal_guardian_id\`)`,
    );
  }
}
