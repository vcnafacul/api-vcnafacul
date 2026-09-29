import { ClaudeEssayProvider } from './claude-essay.provider';
import { OpenAIEssayProvider } from './openai-essay.provider';

/** O formato da imagem em cada SDK (docs de 2026: Anthropic base64 block; OpenAI data URL). */
describe('providers de IA — imagens do texto motivador', () => {
  const env = { get: jest.fn().mockReturnValue('modelo') } as any;
  const resultado = {
    competencias: [],
    comentarioGeral: '',
    trechosDestacados: [],
    notaTotal: 0,
  };
  const imagens = [
    { rotulo: 'Imagem 1', mediaType: 'image/png', base64: 'QUJD' },
  ];

  it('Claude: texto primeiro, depois um bloco image base64 por imagem', async () => {
    const p = new ClaudeEssayProvider(env);
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(resultado) }],
    });
    (p as any).client = { messages: { create } };

    await p.correctEssay('T', 'Veja [Imagem 1]', 'R', imagens);

    const [msg] = create.mock.calls[0][0].messages;
    expect(msg.content[0]).toMatchObject({ type: 'text' });
    expect(msg.content[0].text).toContain('[Imagem 1] fazem parte');
    expect(msg.content[1]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'QUJD' },
    });
  });

  it('OpenAI: texto primeiro, depois image_url com data URL', async () => {
    const p = new OpenAIEssayProvider(env);
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(resultado) } }],
    });
    (p as any).client = { chat: { completions: { create } } };

    await p.correctEssay('T', 'Veja [Imagem 1]', 'R', imagens);

    const [msg] = create.mock.calls[0][0].messages;
    expect(msg.content[0]).toMatchObject({ type: 'text' });
    expect(msg.content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,QUJD' },
    });
  });

  it('sem imagens, só o bloco de texto', async () => {
    const p = new OpenAIEssayProvider(env);
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(resultado) } }],
    });
    (p as any).client = { chat: { completions: { create } } };

    await p.correctEssay('T', 'M', 'R');
    expect(create.mock.calls[0][0].messages[0].content).toHaveLength(1);
  });
});
