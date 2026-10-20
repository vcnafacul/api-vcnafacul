/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Junta a cobertura dos shards da CI e confere os limites (tickets/051 · 01).
 *
 * Cada shard roda `jest --shard=N/M --coverage --coverageThreshold='{}'` e
 * publica o seu `coverage-final.json`; um job final chama este script com
 * os arquivos. Os limites vêm do `jest-e2e.json` (não ficam duplicados aqui).
 *
 * Uso: node test/utils/checar-cobertura.js <coverage-final.json>...
 */
const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const RAIZ = path.resolve(__dirname, '..', '..');

function juntar(mapas) {
  const mapa = libCoverage.createCoverageMap({});
  for (const m of mapas) mapa.merge(m);
  return mapa;
}

/**
 * @param {object[]} mapas  conteúdo de cada coverage-final.json
 * @param {object} limites  `coverageThreshold` do jest: { global: {...}, 'src/x.ts': {...} }
 * @returns {{ mapa, total, falhas: string[] }}
 */
function avaliar(mapas, limites) {
  const mapa = juntar(mapas);
  const total = mapa.getCoverageSummary();
  const falhas = [];
  for (const [chave, limite] of Object.entries(limites || {})) {
    if (chave === 'global') {
      for (const [metrica, minimo] of Object.entries(limite)) {
        if (total[metrica].pct < minimo) {
          falhas.push(`global: ${metrica} ${total[metrica].pct}% < ${minimo}%`);
        }
      }
      continue;
    }
    // As chaves do mapa são caminhos absolutos do runner; a do limite é relativa à raiz.
    const arquivo = mapa
      .files()
      .find((f) => f === path.resolve(RAIZ, chave) || f.endsWith(`/${chave}`));
    if (!arquivo) {
      falhas.push(`${chave}: sem cobertura registrada`);
      continue;
    }
    const resumo = mapa.fileCoverageFor(arquivo).toSummary();
    for (const [metrica, minimo] of Object.entries(limite)) {
      if (resumo[metrica].pct < minimo) {
        falhas.push(
          `${chave}: ${metrica} ${resumo[metrica].pct}% < ${minimo}%`,
        );
      }
    }
  }
  return { mapa, total, falhas };
}

function main(arquivos) {
  if (!arquivos.length) {
    console.error(
      'uso: node test/utils/checar-cobertura.js <coverage-final.json>...',
    );
    process.exit(2);
  }
  const mapas = arquivos.map((a) => JSON.parse(fs.readFileSync(a, 'utf8')));
  const config = JSON.parse(
    fs.readFileSync(path.join(RAIZ, 'test/config/jest-e2e.json'), 'utf8'),
  );
  const { mapa, falhas } = avaliar(mapas, config.coverageThreshold);

  const contexto = libReport.createContext({
    dir: path.join(RAIZ, 'coverage'),
    coverageMap: mapa,
  });
  reports.create('text-summary').execute(contexto);
  console.log(
    `\n${arquivos.length} shard(s) juntados, ${mapa.files().length} arquivos.`,
  );

  if (falhas.length) {
    console.error('\nCobertura abaixo do limite:');
    for (const f of falhas) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('Cobertura dentro dos limites.');
}

module.exports = { avaliar, juntar };

if (require.main === module) main(process.argv.slice(2));
