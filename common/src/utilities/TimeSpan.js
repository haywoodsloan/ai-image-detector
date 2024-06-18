export class TimeSpan {
  #value = 0;

  /**
   * @param {number} seconds
   */
  static fromSeconds(seconds) {
    return new TimeSpan(seconds * 1000);
  }

  /**
   * @param {number} minutes
   */
  static fromMinutes(minutes) {
    return new TimeSpan(minutes * 60 * 1000);
  }

  /**
   * @param {number} hours
   */
  static fromHours(hours) {
    return new TimeSpan(hours * 60 * 60 * 1000);
  }

  /**
   * @param {number | TimeSpan} value
   */
  constructor(value = 0) {
    this.#value = value.valueOf();
  }

  /**
   * @param {number} seconds
   */
  addSeconds(seconds) {
    this.#value += seconds * 1000;
  }

  /**
   * @param {number} minutes
   */
  addMinutes(minutes) {
    this.#value += minutes * 60 * 1000;
  }

  /**
   * @param {number} hours
   */
  addHours(hours) {
    this.#value += hours * 60 * 60 * 1000;
  }

  getSeconds() {
    return this.#value / 1000;
  }

  getMinutes() {
    return this.#value / 1000 / 60;
  }

  getHours() {
    return this.#value / 1000 / 60 / 60;
  }

  valueOf() {
    return this.#value;
  }
}
export default TimeSpan;
