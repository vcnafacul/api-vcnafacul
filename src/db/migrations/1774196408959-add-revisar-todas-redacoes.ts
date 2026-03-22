import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRevisarTodasRedacoes1774196408959 implements MigrationInterface {
    name = 'AddRevisarTodasRedacoes1774196408959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` ADD \`revisar_todas_redacoes\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`revisar_todas_redacoes\``);
    }

}
