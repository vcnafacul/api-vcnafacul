import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { CursinhoResolverService } from '../prova/cursinho/cursinho-resolver.service';
import { Ator } from './ator';

@Injectable()
export class AtorService {
  constructor(
    private readonly userService: UserService,
    private readonly cursinhoResolver: CursinhoResolverService,
  ) {}

  /** O ator a partir do id do JWT (`req.user.id`). */
  async resolver(userId: string): Promise<Ator> {
    const [user, cursinhoId] = await Promise.all([
      this.userService.findOneBy({ id: userId }),
      this.cursinhoResolver.resolveCursinhoIdOuNull(userId),
    ]);
    const role = user?.role;
    return {
      userId,
      cursinhoId,
      admin: !!(role?.criarQuestao || role?.validarQuestao),
      editorCursinho: !!role?.editarQuestoesCursinho,
      validadorProjeto: !!role?.validarQuestao,
      validadorCursinho: !!role?.validarQuestoesCursinho,
    };
  }
}
