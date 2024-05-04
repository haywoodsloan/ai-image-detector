import colors from 'cli-color';
import { basename } from 'path';
import { validateImageUrl } from './validate.js';

export class ImageValidationQueue {
  // Track validations and validated files
  /** @type {Set<Promise<import('./validate.js').ValidationResult>>} */
  #validations = new Set();

  /** @type {import('./huggingface.js').Upload[]} */
  #validated = [];

  /**
   * @param {import('./huggingface.js').Upload} upload
   */
  async addToQueue(upload) {
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

  getPotentialCount() {
    return this.#validations.size;
  }

  clearQueue() {
    this.#validated.length = 0;
    this.#validations.clear();
  }
}
