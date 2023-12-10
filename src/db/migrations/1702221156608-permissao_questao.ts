import { MigrationInterface, QueryRunner } from "typeorm";

export class PermissaoQuestao1702221156608 implements MigrationInterface {
    name = 'PermissaoQuestao1702221156608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "banco_questoes"`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "criar_questao" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "visualizar_questao" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "validar_questao" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "validar_questao"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "visualizar_questao"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "criar_questao"`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "banco_questoes" boolean NOT NULL DEFAULT false`);
    }

}
