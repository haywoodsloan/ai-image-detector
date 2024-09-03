import { BaseAction } from './base.js';

export class TtlAction extends BaseAction {
  static actionName = 'TtlAction';

  /** @type {Map<string, string>} */
  static #timeouts = new Map();

  /**
   *
   * @param {{storageKey: string, ttl: number}}
   */
  static async invoke({ storageKey, ttl }) {
    clearTimeout(this.#timeouts.get(storageKey));
    this.#timeouts.set(
      storageKey,
      setTimeout(async () => await storage.removeItem(storageKey), ttl)
    );
  }
}
