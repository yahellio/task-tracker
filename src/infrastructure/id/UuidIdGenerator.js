import { randomUUID } from 'node:crypto';
import { IdGenerator } from '../../domain/ports.js';

export class UuidIdGenerator extends IdGenerator {
  next() {
    return randomUUID();
  }
}
