import { exec } from 'child_process';

const SleepDuration = 1000;
const TimeoutMinutes = 5;
const AutotrainUrl = 'http://localhost:7860';

// Periodically check if the autotrain site is available
const stopTime = Date.now() + TimeoutMinutes * 60 * 1000;
while (true) {
  try {
    await fetch(AutotrainUrl);
    break;
  } catch (error) {
    if (Date.now() > stopTime) {
      throw new Error(
        `Autotrain not available after ${TimeoutMinutes} minutes:\n  ${error}`
      );
    }
    await new Promise((res) => setTimeout(res, SleepDuration));
  }
}

exec(`start ${AutotrainUrl}`);
