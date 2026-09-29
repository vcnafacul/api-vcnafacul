export interface AICompetencyResult {
  numero: number;
  nota: number;
  justificativa: string;
  sugestao: string;
}

export interface AIHighlightedExcerpt {
  trecho: string;
  tipo: 'positivo' | 'negativo';
  comentario: string;
}

export interface AICorrectionResult {
  competencias: AICompetencyResult[];
  comentarioGeral: string;
  trechosDestacados: AIHighlightedExcerpt[];
  notaTotal: number;
}

/** Imagem do texto motivador, citada no texto como `[<rotulo>]`. */
export interface ImagemParaIA {
  rotulo: string;
  mediaType: string;
  base64: string;
}

export interface EssayAIProvider {
  correctEssay(
    themeTitle: string,
    motivationalText: string,
    essayText: string,
    imagens?: ImagemParaIA[],
  ): Promise<AICorrectionResult>;
}

export const ESSAY_AI_PROVIDER = 'ESSAY_AI_PROVIDER';
