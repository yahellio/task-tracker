export class Attachment {
  #id;
  #originalName;
  #storageKey;
  #mimeType;
  #size;
  #uploadedAt;

  constructor({ id, originalName, storageKey, mimeType, size, uploadedAt }) {
    this.#id = id;
    this.#originalName = originalName;
    this.#storageKey = storageKey;
    this.#mimeType = mimeType;
    this.#size = size;
    this.#uploadedAt = uploadedAt instanceof Date ? uploadedAt : new Date(uploadedAt);
    Object.freeze(this);
  }

  get id() {
    return this.#id;
  }

  get originalName() {
    return this.#originalName;
  }

  get storageKey() {
    return this.#storageKey;
  }

  get mimeType() {
    return this.#mimeType;
  }

  get size() {
    return this.#size;
  }

  get uploadedAt() {
    return this.#uploadedAt;
  }

  toState() {
    return {
      id: this.#id,
      originalName: this.#originalName,
      storageKey: this.#storageKey,
      mimeType: this.#mimeType,
      size: this.#size,
      uploadedAt: this.#uploadedAt.toISOString()
    };
  }
}
