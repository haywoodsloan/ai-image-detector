import { request } from '@/api/base.js';
import { BaseAction } from './base.js';

export class ApiAction extends BaseAction {
  static actionName = 'ApiAction';

  /**
   * @param {{endpoint: string, init?: RequestInit}}
   */
  static invoke({ endpoint, init }) {
    return request(endpoint, init);
  }
}

