/** Por que um cadastro do Localiza foi rejeitado. */
export enum MotivoRejeicaoGeo {
  JaCadastrado = 'JA_CADASTRADO',
  InformacaoInsuficiente = 'INFORMACAO_INSUFICIENTE',
  NaoECursinhoPopular = 'NAO_E_CURSINHO_POPULAR',
  Outro = 'OUTRO',
}

export const rotulosMotivoRejeicao: Record<MotivoRejeicaoGeo, string> = {
  [MotivoRejeicaoGeo.JaCadastrado]: 'Cursinho já cadastrado',
  [MotivoRejeicaoGeo.InformacaoInsuficiente]:
    'Informação insuficiente para checagem',
  [MotivoRejeicaoGeo.NaoECursinhoPopular]: 'Não é um cursinho popular',
  [MotivoRejeicaoGeo.Outro]: 'Outro',
};
