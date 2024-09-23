import { ApiError } from '@/api/base.js';

import { BaseAction } from './base.js';

export class DataUrlAction extends BaseAction {
  static actionName = 'DataUrlAction';

  /**
   * @param {{src: string}}
   */
  static async invoke({ src }) {
    const response = await fetch(src, { credentials: 'include' });
    if (!response.ok) {
      const errorMsg = `Background image fetch failed (Status=${response.status}, Url=${src})`;
      throw new ApiError(response.status, errorMsg);
    }

    const blob = await response.blob();
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = ({ target: { result } }) => res(result);
      reader.readAsDataURL(blob);
    });
  }
}
