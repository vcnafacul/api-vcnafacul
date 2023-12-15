import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleProva1702509456046 implements MigrationInterface {
  name = 'RoleProva1702509456046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "visualizar_provas" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD "cadastrar_provas" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "cadastrar_provas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN "visualizar_provas"`,
    );
  }
}
