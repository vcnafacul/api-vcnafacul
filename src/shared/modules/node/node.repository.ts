import { Repository } from 'typeorm';
import { BaseRepository } from '../base/base.repository';
import { NodeEntity } from './node.entity';

export class NodeRepository<T> extends BaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {
    super(repository);
  }

  async getOrder(nodes: NodeEntity[], start: string) {
    const orderedNodes: NodeEntity[] = [];
    let currentNode = nodes.find((n) => n.id === start);
    while (currentNode) {
      orderedNodes.push(currentNode);
      currentNode = nodes.find((n) => n.id === currentNode.next);
    }
    return orderedNodes;
  }
}
