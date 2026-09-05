import fs from 'node:fs/promises';
import path from 'node:path';
import { NotFoundError } from '../../domain/errors.js';
import { FileStorage } from '../../domain/ports.js';

const STORAGE_KEY_PATTERN = /^[A-Za-z0-9-]+(\.[a-z0-9]{1,10})?$/;
const EXTENSION_PATTERN = /^\.[A-Za-z0-9]{1,10}$/;

const extensionOf = (originalName) => {
  const extension = path.extname(originalName ?? '');
  return EXTENSION_PATTERN.test(extension) ? extension.toLowerCase() : '';
};

export class LocalFileStorage extends FileStorage {
  #directory;
  #ids;

  constructor({ directory, idGenerator }) {
    super();
    this.#directory = directory;
    this.#ids = idGenerator;
  }

  async save(file) {
    const storageKey = `${this.#ids.next()}${extensionOf(file.originalName)}`;
    await fs.writeFile(path.join(this.#directory, storageKey), file.content);
    return storageKey;
  }

  async remove(storageKey) {
    try {
      await fs.unlink(this.locate(storageKey));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  locate(storageKey) {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new NotFoundError('Файл вложения не найден');
    }
    return path.join(this.#directory, storageKey);
  }
}
