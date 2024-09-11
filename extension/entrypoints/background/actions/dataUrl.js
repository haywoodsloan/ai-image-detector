import { BaseAction } from './base.js';

export class DataUrlAction extends BaseAction {
  static actionName = 'DataUrlAction';

  /**
   * @param {{src: string}}
   */
  static async invoke({ src }) {
    const response = await fetch(src);
    const blob = await response.blob();

    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = ({ target: { result } }) => res(result);
      reader.readAsDataURL(blob);
    });
  }
}
