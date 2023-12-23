import { NodeRepository } from '../node/node.repository';
import { EntityManager } from 'typeorm';
import { LinkedListEntity } from './linked-list.entity';
import { NodeEntity } from '../node/node.entity';
import { HttpException, HttpStatus } from '@nestjs/common';

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
      await this.repositoryNodeChild.update(data);
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
    return true;
  }

  async changeOrder(id1: number, id2?: number) {
    const node1 = await this.getNode(id1);

    await this.removeNode(node1);

    const entity = await this.getEntityList({ id: node1.list });

    let node2 = null;
    if (id2) {
      node2 = await this.getNode(id2);
      if (node2.next) {
        const node2Next = await this.getNode(node2.next);
        node2.next = node1.id;
        node1.next = node2Next.id;
        node1.prev = node2.id;
        node2Next.prev = node1.id;
        await this.repositoryNodeChild.update(node2Next);
      } else {
        entity.tail = node1.id;
        node2.next = node1.id;
        node1.prev = node2.id;
        node1.next = null;
      }
    } else {
      const oldHead = await this.repositoryNodeChild.findOneBy({
        id: entity.head,
      });
      entity.head = node1.id;
      node1.next = oldHead.id;
      node1.prev = null;
      oldHead.prev = node1.id;
    }

    await this.repositoryNodeChild.update(node1);
    await this.repository.save(entity);
    if (node2) {
      await this.repositoryNodeChild.update(node2);
    }
  }

  async getNode(id: number) {
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

  async removeNode(node: NodeEntity) {
    const entity = await this.getEntityList({ id: node.list });
    if (!node.prev) {
      if (entity.head !== node.id) {
        throw new HttpException(
          `Erro ao tentar remover. No ${node.id} não é a cabeça da lista ${node.list}`,
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
    await this.repository.save(entity);
  }
}
