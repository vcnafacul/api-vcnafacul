import { buildEssayPrompt } from './essay-prompt';

describe('buildEssayPrompt', () => {
  it('should include theme title, motivational text, and essay text', () => {
    const result = buildEssayPrompt('Tema X', 'Texto motivador', 'Minha redacao');
    expect(result).toContain('Tema X');
    expect(result).toContain('Texto motivador');
    expect(result).toContain('Minha redacao');
  });

  it('should include JSON format instructions', () => {
    const result = buildEssayPrompt('T', 'M', 'E');
    expect(result).toContain('competencias');
    expect(result).toContain('notaTotal');
    expect(result).toContain('comentarioGeral');
    expect(result).toContain('trechosDestacados');
  });
});
