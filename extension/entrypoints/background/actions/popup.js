import { BaseAction } from './base.js';

export class PopupAction extends BaseAction {
  static actionName = 'PopupAction';
  static invoke = async () => {
    await browser.action.openPopup();
  };
}
