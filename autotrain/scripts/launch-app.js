import { exec } from 'child_process';

const SleepDuration = 1000;
const TimeoutMinutes = 5;
const AutotrainUrl = 'http://localhost:7860';

let retryCount = 0;
const maxRetryCount = (TimeoutMinutes * 60 * 1000) / SleepDuration;

while (true) {
  try {
    await fetch(AutotrainUrl);
    break;
  } catch (error) {
    if (retryCount >= maxRetryCount) {
      throw new Error(
        `Autotrain is not available after 90 seconds:\n  ${error}`
      );
    }

    await new Promise((res) => setTimeout(res, SleepDuration));
    retryCount++;
  }
}

exec(`start ${AutotrainUrl}`);
