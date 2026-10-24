import { fakerPT_BR as faker } from '@faker-js/faker';

export const SEED = 53;

/** Recomeça a sequência: rodar o seed de novo gera os mesmos nomes. */
export function reiniciarAleatorio() {
  faker.seed(SEED);
}

export const chance = (p: number) => faker.number.float({ min: 0, max: 1 }) < p;
export const entre = (min: number, max: number) =>
  faker.number.int({ min, max });
export const escolher = <T>(lista: readonly T[]) =>
  faker.helpers.arrayElement(lista);
export { faker };
