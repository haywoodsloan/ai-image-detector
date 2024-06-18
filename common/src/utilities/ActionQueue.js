export class ActionQueue {
  /** @type {() => Promise<void> | void} */
  #actionQueue = [];

  /** @type {Promise<void>?} */
  #actionLoop = null;

  /**
   * @template T
   * @param {() => Promise<T> | T} action
   */
  queue(action) {
    return new Promise((res) => {
      this.#actionQueue.push(async () => res(await action()));
      if (!this.#actionLoop) {
        this.#actionLoop = (async () => {
          while (this.#actionQueue.length) {
            const action = this.#actionQueue.shift();
            res(await action());
          }
          this.#actionLoop = null;
        })();
      }
    });
  }

  async flush() {
    await this.#actionLoop;
  }
}
export default ActionQueue;
