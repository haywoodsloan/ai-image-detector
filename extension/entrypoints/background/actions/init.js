import TimeSpan from 'common/utilities/TimeSpan.js';
import { wait } from 'common/utilities/sleep.js';
import memoize from 'memoize';

export const InitAction = 'init';
export default memoize(async () => {
  await wait(TimeSpan.fromSeconds(1));
  return true;
});
