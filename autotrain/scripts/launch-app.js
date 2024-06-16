import { exec } from 'child_process';
import { TimeSpan } from 'common/utilities/TimeSpan.js';

const SleepDuration = 1000;
const Timeout = TimeSpan.fromMinutes(5);
const AutotrainUrl = 'http://localhost:7860';

// Periodically check if the autotrain site is available
const stopTime = Date.now() + Timeout;
while (true) {
  try {
    await fetch(AutotrainUrl);
    break;
  } catch (error) {
    if (Date.now() > stopTime) {
      throw new Error(
        'Autotrain not available after ' +
          `${Timeout.getMinutes()} minutes:\n  ${error}`
      );
    }
    await new Promise((res) => setTimeout(res, SleepDuration));
  }
}

exec(`start ${AutotrainUrl}`);
