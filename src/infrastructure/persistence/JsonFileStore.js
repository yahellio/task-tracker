import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export class JsonFileStore {
  #filePath;
  #fallback;
  #cache = null;
  #queue = Promise.resolve();

  constructor({ filePath, fallback = [] }) {
    this.#filePath = filePath;
    this.#fallback = fallback;
  }

  async read() {
    if (this.#cache === null) {
      this.#cache = await this.#load();
    }
    return this.#cache;
  }

  async mutate(mutator) {
    return this.#enqueue(async () => {
      const current = await this.read();
      const { next, result } = await mutator(current);
      await this.#persist(next);
      this.#cache = next;
      return result;
    });
  }

  async #load() {
    try {
      const raw = await fs.readFile(this.#filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : structuredClone(this.#fallback);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return structuredClone(this.#fallback);
      }
      throw error;
    }
  }

  async #persist(data) {
    const tempPath = path.join(path.dirname(this.#filePath), `.${path.basename(this.#filePath)}.${randomUUID()}.tmp`);
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempPath, this.#filePath);
  }

  #enqueue(operation) {
    const run = this.#queue.then(operation, operation);
    this.#queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}
