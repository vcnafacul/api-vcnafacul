import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClassEssaySnapshots1779120574243 implements MigrationInterface {
  name = 'ClassEssaySnapshots1779120574243';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`class_essay_snapshots\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`class_id\` varchar(36) NOT NULL, \`month\` varchar(7) NOT NULL, \`month_start\` timestamp NOT NULL, \`month_end\` timestamp NOT NULL, \`user_ids\` json NOT NULL, \`payload\` json NOT NULL, \`generated_at\` timestamp NOT NULL, \`source_essay_count\` int NOT NULL, UNIQUE INDEX \`IDX_de1016d45c9f3aab5c0cbfcffd\` (\`class_id\`, \`month\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`class_essay_snapshots\` ADD CONSTRAINT \`FK_edc029c33761080762d8c479db5\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`class_essay_snapshots\` DROP FOREIGN KEY \`FK_edc029c33761080762d8c479db5\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_de1016d45c9f3aab5c0cbfcffd\` ON \`class_essay_snapshots\``,
    );
    await queryRunner.query(`DROP TABLE \`class_essay_snapshots\``);
  }
}
