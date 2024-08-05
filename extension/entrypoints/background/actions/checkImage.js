import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';

import { BaseAction } from './base.js';

export class CheckImageAction extends BaseAction {
  static async invoke(url) {
    await wait(TimeSpan.fromSeconds(5));
    const data = await fetch(url, { credentials: 'same-origin' });
    console.log('image data', url, await data.arrayBuffer());
  }
}
