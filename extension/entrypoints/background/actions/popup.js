import { BaseAction } from './base.js';

export class PopupAction extends BaseAction {
  static actionName = 'PopupAction';
  static async invoke() {
    await browser.action.openPopup();
  }
}
