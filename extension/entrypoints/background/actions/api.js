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
  static invoke({ endpoint, init, id }) {
    if (!id) return request(endpoint, init);

    const aborter = new AbortController();
    Aborters.set(id, aborter);

    try {
      return request(endpoint, { ...init, signal: aborter.signal });
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
