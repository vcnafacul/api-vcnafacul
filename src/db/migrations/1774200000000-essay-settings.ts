import { MigrationInterface, QueryRunner } from 'typeorm';

export class EssaySettings1774200000000 implements MigrationInterface {
  name = 'EssaySettings1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`essay_settings\` (\`id\` varchar(50) NOT NULL DEFAULT 'default', \`ai_enabled\` tinyint NOT NULL DEFAULT 1, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `INSERT INTO \`essay_settings\` (\`id\`, \`ai_enabled\`) VALUES ('default', 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`essay_settings\``);
  }
}
