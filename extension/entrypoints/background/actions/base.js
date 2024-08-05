/**
 * @abstract
 * @static
 */
export class BaseAction {
  static get actionName() {
    return this.name;
  }

  constructor() {
    if (this.constructor === BaseAction)
      throw new Error('Actions are static types and cannot be instantiated.');
  }

  /**
   * @abstract
   * @returns {any}
   */
  static invoke() {
    throw new Error(`${this.name} does not implement invoke()`);
  }
}
