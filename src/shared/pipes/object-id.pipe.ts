import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Garante que um parâmetro de rota é um ObjectId do Mongo antes de ele ser
 * concatenado numa URL.
 *
 * ⚠️ **Por que existe.** Os proxies para o `ms-simulado` montam a URL
 * concatenando o parâmetro (`getFullURL` só junta strings), e o Express
 * entrega o valor **já decodificado**. Medido:
 *
 * ```
 * GET /mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2Foutro
 *   → Express casa como UM segmento (200) e decodifica
 *   → api chama http://ms-simulado:3000/v1/simulado/outro
 * ```
 *
 * Quem tem a permissão do endpoint alcança **qualquer rota do ms**, com a
 * posição de rede da api — inclusive rotas expostas atrás de outras
 * permissões.
 *
 * ⚠️ **Allowlist, não lista de proibidos.** Remover `..`, `?`, `#` e `%` é a
 * forma que sempre deixa um passar: `%252F` sobrevive a uma rodada de
 * decodificação, e a lista nunca acaba. O formato do id é fechado.
 */
const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class ObjectIdPipe implements PipeTransform<string, string> {
  transform(valor: string): string {
    if (typeof valor !== 'string' || !OBJECT_ID.test(valor)) {
      // Não ecoa o valor recebido: é como um XSS refletido nasce, e o formato
      // esperado é a parte útil para quem chamou.
      throw new BadRequestException(
        'identificador inválido: esperado um ObjectId de 24 caracteres hexadecimais',
      );
    }
    return valor;
  }
}
