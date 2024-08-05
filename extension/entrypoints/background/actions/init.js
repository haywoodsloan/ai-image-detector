import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';
import memoize from 'memoize';

import { BaseAction } from './base.js';

export class InitAction extends BaseAction {
  static invoke = memoize(async () => {
    await wait(TimeSpan.fromSeconds(1));
    return true;
  });
}
