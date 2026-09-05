export class FileStorage {
  async save(_file) {
    throw new Error('FileStorage.save is not implemented');
  }

  async remove(_storageKey) {
    throw new Error('FileStorage.remove is not implemented');
  }

  locate(_storageKey) {
    throw new Error('FileStorage.locate is not implemented');
  }
}
