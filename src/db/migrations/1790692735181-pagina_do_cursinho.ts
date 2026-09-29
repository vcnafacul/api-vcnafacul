import { MigrationInterface, QueryRunner } from "typeorm";

export class PaginaDoCursinho1790692735181 implements MigrationInterface {
    name = 'PaginaDoCursinho1790692735181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`cursinho_link\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`pagina_id\` varchar(255) NOT NULL, \`tipo\` varchar(10) NOT NULL, \`titulo\` varchar(100) NOT NULL, \`url\` varchar(500) NOT NULL, \`ordem\` int NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cursinho_pagina\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`partner_prep_course_id\` varchar(255) NOT NULL, \`slug\` varchar(60) NOT NULL, \`quem_somos\` text NULL, \`active\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_875ead037b6096f1efb5544376\` (\`slug\`), UNIQUE INDEX \`REL_c408719e44b2623c85de41a9f0\` (\`partner_prep_course_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`cursinho_link\` ADD CONSTRAINT \`FK_9d0296547b89f6c8246b4c2a26c\` FOREIGN KEY (\`pagina_id\`) REFERENCES \`cursinho_pagina\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cursinho_pagina\` ADD CONSTRAINT \`FK_c408719e44b2623c85de41a9f00\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cursinho_pagina\` DROP FOREIGN KEY \`FK_c408719e44b2623c85de41a9f00\``);
        await queryRunner.query(`ALTER TABLE \`cursinho_link\` DROP FOREIGN KEY \`FK_9d0296547b89f6c8246b4c2a26c\``);
        await queryRunner.query(`DROP INDEX \`REL_c408719e44b2623c85de41a9f0\` ON \`cursinho_pagina\``);
        await queryRunner.query(`DROP INDEX \`IDX_875ead037b6096f1efb5544376\` ON \`cursinho_pagina\``);
        await queryRunner.query(`DROP TABLE \`cursinho_pagina\``);
        await queryRunner.query(`DROP TABLE \`cursinho_link\``);
    }

}
