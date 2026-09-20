import { ApiProperty } from '@nestjs/swagger';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class GetHistoricoDTOInput extends GetAllDtoInput {
  @ApiProperty()
  /**
   * ⚠️ **Sem decorator de class-validator de propósito? Não — por acidente.**
   *
   * Quem impede um `userId` injetado pelo cliente é o `whitelist: true` da
   * `ValidationPipe` global (`main.ts`), que descarta a propriedade antes de o
   * serviço montar a query. Isso, e só isso, é o que este parágrafo pode
   * afirmar.
   *
   * ⚠️ **O que ESTAVA escrito aqui antes — "o `getAllByUser` acrescenta o id
   * do JWT no fim, e o escopo se mantém" — era FALSO, e o escopo caía.** O
   * `getAllByUser` concatenava os valores da query crus, e `page`/`limit` no
   * `GetAllDtoInput` têm só `@IsOptional()`: sem validador de tipo e sem
   * `@Type(() => Number)`, uma STRING arbitrária atravessa o pipe. Bastava
   * `?page=1%26userId%3D<vítima>%23` — o `URL` que o axios monta descarta tudo
   * depois do `#`, e o `userId` acrescentado no fim ia junto. O ms recebia
   * `/v1/historico?page=1&userId=<vítima>` e devolvia o histórico alheio
   * inteiro. Medido contra socket.
   *
   * ⚠️ **Hoje o escopo se mantém por causa do `URLSearchParams` no serviço**,
   * que encoda cada valor e faz `set('userId', ...)` no fim (sobrescreve, não
   * duplica) — não por causa do `whitelist`, que só cobre ESTE campo. Ver o
   * docblock de `historico/historico.service.ts`.
   *
   * Um `@IsOptional()` aqui e o `whitelist` passa a deixar o valor do cliente
   * entrar; o `set()` ainda o sobrescreveria, mas não conte com isso sem
   * cobrir com teste.
   */
  userId: number;
}
