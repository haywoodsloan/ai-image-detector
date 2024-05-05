import { validateImageUrl } from './validate.js';
import colors from 'cli-color';
import { basename } from 'path';

export class ImageValidationQueue {
  // Track validations and validated files
  /** @type {Set<Promise<import('./validate.js').ValidationResult>>} */
  #validations = new Set();

  /** @type {import('./huggingface.js').Upload[]} */
  #validated = [];

  /**
   * @param {import('./huggingface.js').Upload} upload
   */
  async queueValidation(upload) {
    const validation = validateImageUrl(upload.content).then((result) => {
      if (!result.isValid) {
        const fileName = basename(upload.path);
        console.log(colors.red(`Skipping: ${fileName} [${result.error}]`));

        // Stop tracking this validation
        this.#validations.delete(validation);
        return result;
      }

      this.#validated.push(upload);
      return result;
    });

    this.#validations.add(validation);
    return validation;
  }

  async getValidated() {
    await Promise.all([...this.#validations]);
    return [...this.#validated];
  }

  /**
   * @returns The maximum possible valid images,
   * combines validated and pending images
   */
  get size() {
    return this.#validations.size;
  }

  clear() {
    this.#validated.length = 0;
    this.#validations.clear();
  }
}
