#!/usr/bin/env node
import { spawn } from 'child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { y } from '../src/utilities/colors.js';
import { wait } from '../src/utilities/sleep.js';

await yargs(hideBin(process.argv))
  .command(
    '$0 <cmd>',
    false,
    (yargs) =>
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
        }),
    async (args) => {
      let count = 0;
      while (count < args.count) {
        const child = spawn(args.cmd, { shell: true, stdio: 'inherit' });
        await new Promise((res) => child.once('close', res));

        count++;
        if (args.timeout) {
          console.log(y`\nWaiting for ${args.timeout} seconds...`);
          await wait(args.timeout * 1000);
        }
      }
    }
  )
  .parse();
