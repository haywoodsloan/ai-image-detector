import { exec } from 'child_process';

const SleepDuration = 500;
const MaximumRetryCount = 90 * (1000 / SleepDuration);

let retryCount = 0;
while (true) {
  try {
    await fetch('http://localhost:7860');
    break;
  } catch (error) {
    if (retryCount >= MaximumRetryCount) {
      throw `Autotrain is not available after 90 seconds:\n  ${error}`;
    }

    await new Promise((res) => setTimeout(res, SleepDuration));
    retryCount++;
  }
}

exec('start http://localhost:7860');
