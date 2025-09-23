import { MigrationInterface, QueryRunner } from 'typeorm';

export class SnapshotContentStatus1758148326855 implements MigrationInterface {
  name = 'SnapshotContentStatus1758148326855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`snapshot_content_status\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`snapshot_date\` date NOT NULL, \`pendentes\` int NOT NULL DEFAULT '0', \`aprovados\` int NOT NULL DEFAULT '0', \`reprovados\` int NOT NULL DEFAULT '0', \`pendentes_upload\` int NOT NULL DEFAULT '0', \`total\` int NOT NULL DEFAULT '0', UNIQUE INDEX \`IDX_de416546e101a7076c5f11d13c\` (\`snapshot_date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_de416546e101a7076c5f11d13c\` ON \`snapshot_content_status\``,
    );
    await queryRunner.query(`DROP TABLE \`snapshot_content_status\``);
  }
}
