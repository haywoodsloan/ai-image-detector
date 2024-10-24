import { request } from '@/api/base.js';

import { BaseAction } from './base.js';

/** @type {Map<string, AbortController>} */
const Aborters = new Map();

export class ApiAction extends BaseAction {
  static actionName = 'ApiAction';

  /**
   * @param {{
   *    endpoint: string,
   *    init?: RequestInit,
   *    id?: string
   * }}
   */
  static async invoke({ endpoint, init, id }) {
    if (!id) return await request(endpoint, init);

    const aborter = new AbortController();
    Aborters.set(id, aborter);

    try {
      return await request(endpoint, { ...init, signal: aborter.signal });
    } finally {
      Aborters.delete(id);
    }
  }
}

export class AbortApiAction extends BaseAction {
  static actionName = 'AbortApiAction';

  /**
   * @param {{id: string}}
   */
  static invoke({ id }) {
    Aborters.get(id)?.abort();
  }
}
