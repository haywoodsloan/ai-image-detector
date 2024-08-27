/**
 * @abstract
 * @static
 */
export class BaseAction {
  constructor() {
    throw new Error('Actions are static types and cannot be instantiated.');
  }

  /**
   * @abstract
   * @returns {string}
   */
  static get actionName() {
    throw new Error(`${this.name} does not implement actionName`);
  }

  /**
   * @abstract
   * @returns {any}
   */
  static invoke() {
    throw new Error(`${this.name} does not implement invoke()`);
  }
}
