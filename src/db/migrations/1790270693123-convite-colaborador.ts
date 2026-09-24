import { MigrationInterface, QueryRunner } from "typeorm";

export class ConviteColaborador1790270693123 implements MigrationInterface {
    name = 'ConviteColaborador1790270693123'

    /*
      ⚠️ **Homol e prod são MariaDB, não MySQL.** O TypeORM (driver `mysql`)
      gerou `AS (...) STORED NULL`, e o MariaDB não aceita restrição de
      nulidade em coluna gerada — "error in your SQL syntax near 'NULL, UNIQUE
      INDEX'". Sem o `NULL`, vale nos dois: coluna gerada já aceita nulo.

      ⚠️ Gerada pelo TypeORM, com outro ajuste: o registro da coluna gerada no
      `typeorm_metadata` vinha com o banco `vcnafacul` fixo no SQL. Trocado
      pelo banco corrente — homol e prod podem ter outro nome (`MY_DB_NAME`).
    */
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`convites_colaborador\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`email\` varchar(255) NOT NULL, \`partner_prep_course_id\` varchar(255) NOT NULL, \`role_id\` varchar(255) NOT NULL, \`convidado_por\` varchar(255) NOT NULL, \`token_hash\` varchar(64) NOT NULL, \`status\` enum ('pendente', 'aceito', 'cancelado', 'expirado') NOT NULL DEFAULT 'pendente', \`expira_em\` timestamp NOT NULL, \`aceito_por\` varchar(255) NULL, \`chave_ativa\` varchar(300) AS (IF(\`status\` = 'pendente', CONCAT(\`email\`, ':', \`partner_prep_course_id\`), NULL)) STORED, UNIQUE INDEX \`IDX_convite_colaborador_chave_ativa\` (\`chave_ativa\`), UNIQUE INDEX \`IDX_0148031d7d5ad1aafb6bd80022\` (\`token_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`INSERT INTO \`typeorm_metadata\`(\`database\`, \`schema\`, \`table\`, \`type\`, \`name\`, \`value\`) VALUES (DEFAULT, ?, ?, ?, ?, ?)`, [await queryRunner.getCurrentDatabase(),"convites_colaborador","GENERATED_COLUMN","chave_ativa","IF(`status` = 'pendente', CONCAT(`email`, ':', `partner_prep_course_id`), NULL)"]);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` ADD CONSTRAINT \`FK_38c4533185bb0d0f3a6a2638888\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` ADD CONSTRAINT \`FK_dcbd551648333509b9a6537df16\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` ADD CONSTRAINT \`FK_a9d9e9ab4e7e1f4257189c6d0df\` FOREIGN KEY (\`convidado_por\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` ADD CONSTRAINT \`FK_da82a976605739c0584adeeb2ec\` FOREIGN KEY (\`aceito_por\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` DROP FOREIGN KEY \`FK_da82a976605739c0584adeeb2ec\``);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` DROP FOREIGN KEY \`FK_a9d9e9ab4e7e1f4257189c6d0df\``);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` DROP FOREIGN KEY \`FK_dcbd551648333509b9a6537df16\``);
        await queryRunner.query(`ALTER TABLE \`convites_colaborador\` DROP FOREIGN KEY \`FK_38c4533185bb0d0f3a6a2638888\``);
        await queryRunner.query(`DELETE FROM \`typeorm_metadata\` WHERE \`type\` = ? AND \`name\` = ? AND \`schema\` = ? AND \`table\` = ?`, ["GENERATED_COLUMN","chave_ativa",await queryRunner.getCurrentDatabase(),"convites_colaborador"]);
        await queryRunner.query(`DROP INDEX \`IDX_0148031d7d5ad1aafb6bd80022\` ON \`convites_colaborador\``);
        await queryRunner.query(`DROP INDEX \`IDX_convite_colaborador_chave_ativa\` ON \`convites_colaborador\``);
        await queryRunner.query(`DROP TABLE \`convites_colaborador\``);
    }

}
