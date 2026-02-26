import { MigrationInterface, QueryRunner } from 'typeorm';

export class CollaboratorFrente1771714725932 implements MigrationInterface {
  name = 'CollaboratorFrente1771714725932';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`collaborator_frentes\` (
        \`id\` varchar(36) NOT NULL,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` timestamp NULL,
        \`collaborator_id\` varchar(36) NOT NULL,
        \`frente_id\` varchar(255) NOT NULL,
        UNIQUE INDEX \`IDX_collaborator_frente\` (\`collaborator_id\`, \`frente_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\`
       ADD CONSTRAINT \`FK_collaborator_frentes_collaborator\`
       FOREIGN KEY (\`collaborator_id\`)
       REFERENCES \`collaborators\`(\`id\`)
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` DROP FOREIGN KEY \`FK_collaborator_frentes_collaborator\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_collaborator_frente\` ON \`collaborator_frentes\``,
    );
    await queryRunner.query(`DROP TABLE \`collaborator_frentes\``);
  }
}
