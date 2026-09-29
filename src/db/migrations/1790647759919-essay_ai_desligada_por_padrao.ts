import { MigrationInterface, QueryRunner } from "typeorm";

export class EssayAiDesligadaPorPadrao1790647759919 implements MigrationInterface {
    name = 'EssayAiDesligadaPorPadrao1790647759919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`essay_settings\` CHANGE \`ai_enabled\` \`ai_enabled\` tinyint NOT NULL DEFAULT 0`);
        // A correção por IA fica manual até escolherem o modelo (decisão de
        // 2026-09-28): desliga também a linha que já existe em cada ambiente.
        // Religar é pelo toggle do admin (PATCH /essay/settings).
        await queryRunner.query(`UPDATE \`essay_settings\` SET \`ai_enabled\` = 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`essay_settings\` CHANGE \`ai_enabled\` \`ai_enabled\` tinyint NOT NULL DEFAULT '1'`);
        // ⚠️ Não religa a IA: o valor anterior de cada ambiente não é conhecido.
    }

}
