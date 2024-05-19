import colors from 'cli-color';
import { readFile, readdir } from 'fs/promises';
import looksSame from 'looks-same';
import { basename, join } from 'path';
import sharp from 'sharp';

// Maximum number of pixels Autotrain will handle
const MaxPixels = 178_956_970;

export class ImageValidationQueue {
  // Track validations and validated files
  /** @type {Set<Promise<ValidationResult>>} */
  #validations = new Set();

  /** @type {ValidatedUpload[]} */
  #validated = [];

  /** @type {{name: string, buffer: Buffer}[]}*/
  static #excludedBuffers;

  static async createQueue() {
    if (!ImageValidationQueue.#excludedBuffers) {
      const excludePath = 'exclude/';
      const excludeEntries = await readdir(excludePath, {
        withFileTypes: true,
        recursive: true,
      });

      ImageValidationQueue.#excludedBuffers = await Promise.all(
        excludeEntries
          .filter((entry) => entry.isFile())
          .map(async (entry) => ({
            name: entry.name,
            buffer: await readFile(join(entry.parentPath, entry.name)),
          }))
      );
    }
    return new ImageValidationQueue();
  }
  constructor() {
    if (!ImageValidationQueue.#excludedBuffers) {
      throw new Error(
        'Use ImageValidateQueue.createQueue() to initialize a new queue'
      );
    }
  }

  /**
   * @param {Upload} upload
   */
  async queueValidation(upload) {
    const validation = this.#validateImage(upload.content)
      .then((blob) => {
        this.#validated.push({ content: blob, path: upload.path });
        return true;
      })
      .catch((error) => {
        const fileName = basename(upload.path);
        console.log(colors.red(`Skipping: ${fileName} [${error}]`));
        this.#validations.delete(validation);
        return false;
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

  /**
   * @param {URL} url
   */
  async #validateImage(url) {
    const image = await fetch(url);
    if (!image.ok) throw new Error(`GET request failed: ${image.statusText}`);

    const contentType = image.headers.get('Content-Type');
    const validHeader = contentType.startsWith('image/');
    if (!validHeader) throw new Error(`Invalid MIME type: ${contentType}`);

    let imageBuffer = Buffer.from(await image.arrayBuffer());
    for (const { name, buffer } of ImageValidationQueue.#excludedBuffers) {
      const { equal } = await looksSame(buffer, imageBuffer, {
        stopOnFirstFail: true,
      });
      if (equal) throw new Error(`Matches an excluded image: ${name}`);
    }

    const { height, width } = await sharp(imageBuffer).metadata();
    const pixelCount = height * width;

    if (pixelCount > MaxPixels) {
      const scale = Math.sqrt(MaxPixels / pixelCount);

      const scaledWidth = Math.floor(width * scale);
      const scaledHeight = Math.floor(height * scale);

      imageBuffer = await sharp(imageBuffer)
        .resize(scaledWidth, scaledHeight, { fit: 'inside' })
        .toBuffer();
    }

    return new Blob([imageBuffer]);
  }
}
