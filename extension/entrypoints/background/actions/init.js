import TimeSpan from 'common/utilities/TimeSpan.js';
import memoize from 'memoize';

import { checkAuth } from '@/api/auth.js';
import { subAuthVerify } from '@/utilities/pubsub.js';
import { userAuth } from '@/utilities/storage.js';

import { AnalyzeImageId } from '../index.js';
import { BaseAction } from './base.js';

export class InitAction extends BaseAction {
  static actionName = 'InitAction';
  static async invoke() {
    await this.#checkAuth();
    await this.#watchAuth();
    await this.#clearAnalysisStorage();
    this.#addContextMenu();
  }

  /** @type {() => void} */
  static #unsubAuthVerify;
  static #authVerified = false;

  static #checkAuth = memoize(
    async () => {
      // If an auth exists check it's still valid
      const auth = await userAuth.getValue();
      if (auth) {
        try {
          const authUpdate = await checkAuth();
          await userAuth.setValue({ ...auth, ...authUpdate });
        } catch (error) {
          if (error.status === 401) {
            await userAuth.removeValue();
          } else throw error;
        }
      }
    },
    { maxAge: TimeSpan.fromMinutes(30) }
  );

  static #watchAuth = memoize(async () => {
    const auth = await userAuth.getValue();
    this.#authVerified = auth?.verification === 'verified';
    this.#subPendingVerify(auth);

    userAuth.watch((newAuth) => {
      this.#unsubAuthVerify?.();
      this.#authVerified = newAuth?.verification === 'verified';
      this.#subPendingVerify(newAuth);
    });
  });

  static #clearAnalysisStorage = memoize(async () => {
    const keys = Object.keys(await browser.storage.local.get(null));
    await browser.storage.local.remove(
      keys.filter((key) => key.startsWith('analysis-'))
    );
  });

  static #addContextMenu = memoize(() => {
    // Add context menu
    browser.contextMenus.create({
      contexts: ['image'],
      title: 'Check if image is AI generated',
      id: AnalyzeImageId,
    });

    // Handle context menu clicks
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (!this.#authVerified) {
        if (browser.action) await browser.action.openPopup();
        else if (browser.browserAction) await browser.browserAction.openPopup();
      }

      await browser.tabs.sendMessage(tab.id, {
        name: AnalyzeImageId,
        data: info.srcUrl,
      });
    });
  });

  /**
   * @param {UserAuth} auth
   */
  static #subPendingVerify(auth) {
    if (auth?.verification === 'pending' && auth?.verificationSocket) {
      this.#unsubAuthVerify = subAuthVerify(
        auth.verificationSocket,
        async () => {
          const stored = await userAuth.getValue();
          await userAuth.setValue({ ...stored, verification: 'verified' });
        }
      );
    }
  }
}
