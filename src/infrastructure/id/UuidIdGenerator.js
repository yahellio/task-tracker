import { randomUUID } from 'node:crypto';
import { IdGenerator } from '../../domain/IdGenerator.js';

export class UuidIdGenerator extends IdGenerator {
  next() {
    return randomUUID();
  }
}
