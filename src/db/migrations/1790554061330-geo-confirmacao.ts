import { MigrationInterface, QueryRunner } from "typeorm";

export class GeoConfirmacao1790554061330 implements MigrationInterface {
    name = 'GeoConfirmacao1790554061330'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`geo_confirmations\` (\`id\` varchar(36) NOT NULL, \`geo_id\` varchar(255) NOT NULL, \`user_id\` varchar(255) NOT NULL, \`confirmado_em\` datetime(3) NOT NULL, UNIQUE INDEX \`UQ_geo_confirmation_geo_user\` (\`geo_id\`, \`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`geolocations\` ADD \`info_updated_at\` datetime(3) NULL`);
        await queryRunner.query(`ALTER TABLE \`geo_confirmations\` ADD CONSTRAINT \`FK_fe15451320ef5c5cde8f067bb69\` FOREIGN KEY (\`geo_id\`) REFERENCES \`geolocations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`geo_confirmations\` ADD CONSTRAINT \`FK_57929ac2ca2765432d01ebece32\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`geo_confirmations\` DROP FOREIGN KEY \`FK_57929ac2ca2765432d01ebece32\``);
        await queryRunner.query(`ALTER TABLE \`geo_confirmations\` DROP FOREIGN KEY \`FK_fe15451320ef5c5cde8f067bb69\``);
        await queryRunner.query(`ALTER TABLE \`geolocations\` DROP COLUMN \`info_updated_at\``);
        await queryRunner.query(`DROP INDEX \`UQ_geo_confirmation_geo_user\` ON \`geo_confirmations\``);
        await queryRunner.query(`DROP TABLE \`geo_confirmations\``);
    }

}
