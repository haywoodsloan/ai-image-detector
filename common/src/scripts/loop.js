#!/usr/bin/env node
import { spawn } from 'child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { wait } from '../utilities/sleep.js';
import { y } from '../utilities/colors.js';

const args = await yargs(hideBin(process.argv))
  .command('$0 <cmd>', 'loop command', (yargs) =>
    yargs
      .option('count', {
        type: 'number',
        description: 'The maximum number of loops',
        default: Infinity,
      })
      .option('timeout', {
        type: 'number',
        description: 'Timeout between loops in seconds',
        default: 0,
      })
      .positional('cmd', {
        type: 'string',
        description: 'The command to execute on a loop',
        demandOption: true,
      })
  )
  .parse();

let count = 0;
while (count < args.count) {
  const child = spawn(args.cmd, { shell: true, stdio: 'inherit' });
  await new Promise((res) => child.once('close', res));

  console.log(y`\nWaiting for ${args.timeout} seconds...\n`);
  await wait(args.timeout * 1000);
  count++;
}
