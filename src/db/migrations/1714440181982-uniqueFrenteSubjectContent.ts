import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueFrenteSubjectContent1714440181982
  implements MigrationInterface
{
  name = 'UniqueFrenteSubjectContent1714440181982';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "frente" DROP CONSTRAINT "UQ_5776f69e94d06608a9be1ecf7da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subject" DROP CONSTRAINT "UQ_d011c391e37d9a5e63e8b04c977"`,
    );
    await queryRunner.query(
      `ALTER TABLE "frente" ADD CONSTRAINT "UQ_b71f980928922d70c48696fe0e4" UNIQUE ("name", "materia")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subject" ADD CONSTRAINT "UQ_ade0f940dba920f53e48e486eb5" UNIQUE ("name", "frenteId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD CONSTRAINT "UQ_26bd75273b5769641de10ecc414" UNIQUE ("title", "subjectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "content" DROP CONSTRAINT "UQ_26bd75273b5769641de10ecc414"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subject" DROP CONSTRAINT "UQ_ade0f940dba920f53e48e486eb5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "frente" DROP CONSTRAINT "UQ_b71f980928922d70c48696fe0e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subject" ADD CONSTRAINT "UQ_d011c391e37d9a5e63e8b04c977" UNIQUE ("name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "frente" ADD CONSTRAINT "UQ_5776f69e94d06608a9be1ecf7da" UNIQUE ("name")`,
    );
  }
}
