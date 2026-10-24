import { readFileSync } from 'fs';
import { join } from 'path';
import { FixtureRespostas } from './respostas';

/**
 * Condição de exibição como fica no fixture: aponta para a pergunta-alvo pelo
 * **texto** (o id de homol não existe aqui). A etapa 04 troca pelo `questionId`
 * novo, no formato do `BaseCondition` do vcnafacul-form.
 */
export interface CondicaoFixture {
  questionText: string;
  operator: string;
  expectedValue: string | number | boolean;
}

export interface CondicoesFixture {
  logic: 'And' | 'Or';
  conditions: CondicaoFixture[];
}

export interface PerguntaFixture {
  text: string;
  helpText: string;
  answerType: string;
  collection: string;
  options: string[];
  conditions: CondicoesFixture | null;
}

export interface SecaoFixture {
  name: string;
  description: string;
  questions: PerguntaFixture[];
}

export interface FormFixture {
  name: string;
  sections: SecaoFixture[];
}

export interface RegraFixture {
  name: string;
  description: string;
  type: 'Score' | 'TieBreaker';
  strategy: string;
  /** Texto exato da pergunta que a regra pontua. */
  pergunta: string;
  config: Record<string, unknown>;
  weight: number;
}

export interface Fixture extends FixtureRespostas {
  global: FormFixture;
  parceiro: FormFixture | null;
  regras: RegraFixture[];
}

export const lerFixture = (): Fixture =>
  JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'formulario.json'), 'utf8'),
  );
