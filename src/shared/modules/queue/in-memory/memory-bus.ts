import { EventEmitter } from 'events';

export const memoryBus = new EventEmitter();
memoryBus.setMaxListeners(50);
