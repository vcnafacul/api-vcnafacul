import { HttpException, HttpStatus } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { NodeEntity } from '../node/node.entity';
import { NodeRepository } from '../node/node.repository';
import { LinkedListEntity } from './linked-list.entity';

export class LinkedListRepository<
  T extends LinkedListEntity,
  K extends NodeEntity,
> extends NodeRepository<T> {
  private readonly repositoryNodeChild: NodeRepository<K>;
  constructor(
    protected readonly _entityManager: EntityManager,
    entityClass: new () => T,
    childEntityClass: new () => K,
  ) {
    super(_entityManager.getRepository(entityClass));
    this.repositoryNodeChild = new NodeRepository<K>(
      _entityManager.getRepository(childEntityClass),
    );
  }

  async addList(data: K, entity: T): Promise<boolean> {
    if (!entity.head) {
      entity.head = data.id;
      entity.tail = data.id;
    } else {
      // Se a lista não está vazia, adicione o novo subject no final
      // Atualize o 'prev' do novo subject para ser o 'tail' atual
      data.prev = entity.tail;
      if (entity.tail) {
        const tail = await this.repositoryNodeChild.findOneBy({
          id: entity.tail,
        });
        tail.next = data.id;
        await this.repositoryNodeChild.update(tail);
      }

      // Atualize o 'tail' da frente para ser o novo subject
      entity.tail = data.id;
    }
    entity.lenght += 1;
    await this.repository.save(entity);
    await this.repositoryNodeChild.update(data);
    return true;
  }

  async changeOrder(listId: string, id1: string, id2: string): Promise<void> {
    if (id1 === id2) return; // Nada a fazer se os IDs forem iguais

    const entity = await this.getEntityList({ id: listId });

    const node1 = await this.getNode(id1);
    const node2 = await this.getNode(id2);

    if (!node1 || !node2) {
      throw new Error('Um ou ambos os nós não foram encontrados.');
    }

    // Salva referências dos vizinhos
    const [node1Prev, node1Next] = [node1.prev, node1.next];
    const [node2Prev, node2Next] = [node2.prev, node2.next];

    // Atualiza os vizinhos do node1
    if (node2Prev && node2Prev !== node1.id) {
      const prev = await this.getNode(node2Prev);
      prev.next = node1.id;
      await this.repositoryNodeChild.update(prev);
    }
    if (node2Next && node2Next !== node1.id) {
      const next = await this.getNode(node2Next);
      next.prev = node1.id;
      await this.repositoryNodeChild.update(next);
    }

    // Atualiza os vizinhos do node2
    if (node1Prev && node1Prev !== node2.id) {
      const prev = await this.getNode(node1Prev);
      prev.next = node2.id;
      await this.repositoryNodeChild.update(prev);
    }
    if (node1Next && node1Next !== node2.id) {
      const next = await this.getNode(node1Next);
      next.prev = node2.id;
      await this.repositoryNodeChild.update(next);
    }

    // Corrige head e tail se necessário
    if (entity.head === node1.id) {
      entity.head = node2.id;
    } else if (entity.head === node2.id) {
      entity.head = node1.id;
    }

    if (entity.tail === node1.id) {
      entity.tail = node2.id;
    } else if (entity.tail === node2.id) {
      entity.tail = node1.id;
    }

    // Troca os ponteiros entre node1 e node2
    [node1.prev, node2.prev] = [
      node2Prev === node1.id ? node2.id : node2Prev,
      node1Prev === node2.id ? node1.id : node1Prev,
    ];
    [node1.next, node2.next] = [
      node2Next === node1.id ? node2.id : node2Next,
      node1Next === node2.id ? node1.id : node1Next,
    ];

    await this.repositoryNodeChild.update(node1);
    await this.repositoryNodeChild.update(node2);
    await this.repository.save(entity);
  }

  async getNode(id: string) {
    const node = await this.repositoryNodeChild.findOneBy({ id });
    if (!node) {
      throw new HttpException(
        `Node not found by Id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return node;
  }

  async getEntityList(where: object) {
    const entity = await this.repository.findOne({ where: { ...where } });
    if (!entity) {
      throw new HttpException(`Entity List not found`, HttpStatus.NOT_FOUND);
    }
    return entity;
  }

  async removeNode(
    dataEntity: T | string,
    dataNode: K | string,
  ): Promise<NodeEntity> {
    let node = null;
    let entity = null;
    if (typeof dataNode === 'string') node = await this.getNode(dataNode);
    else node = dataNode;

    if (typeof dataEntity === 'string')
      entity = await this.getEntityList({ id: dataEntity });
    else entity = dataEntity;

    if (!node.prev) {
      if (entity.head !== node.id) {
        throw new HttpException(
          `Erro ao tentar remover. No ${node.id} não é a cabeça da lista ${entity.id}`,
          HttpStatus.CONFLICT,
        );
      }
      entity.head = node.next;
      if (!entity.head) entity.tail = null;
      const nodeNext = await this.repositoryNodeChild.findOneBy({
        id: node.next,
      });
      if (nodeNext) {
        nodeNext.prev = null;
        await this.repositoryNodeChild.update(nodeNext);
      }
    } else {
      const nodePrev = await this.repositoryNodeChild.findOneBy({
        id: node.prev,
      });
      nodePrev.next = node.next;
      await this.repositoryNodeChild.update(nodePrev);
      if (node.next) {
        const nodeNext = await this.repositoryNodeChild.findOneBy({
          id: node.next,
        });
        nodeNext.prev = nodePrev.id;
        await this.repositoryNodeChild.update(nodeNext);
      } else {
        entity.tail = node.prev;
      }
    }
    entity.lenght -= 1;
    node.next = null;
    node.prev = null;
    await this.repositoryNodeChild.update(node);
    await this.repository.save(entity);
    return node;
  }
}
