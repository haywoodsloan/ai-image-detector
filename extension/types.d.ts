import('common/types.d.ts');

declare type WxtStorageItem<T> = import('wxt/storage').WxtStorageItem<T, {}>;
declare type ContentScriptContext = import('wxt/client').ContentScriptContext;
declare type ShadowRootContentScriptUi<T = void> =
  import('wxt/client').ShadowRootContentScriptUi<T>;

declare type ActionType =
  typeof import('./entrypoints/background/actions/base').BaseAction;

declare type BackgroundTaskReturn = {
  result?: any;
  error?: any;
};

declare type UserAuth = {
  authId: string;
  userId: string;
  accessToken: string;
  verification: 'pending' | 'verified';
  verificationSocket: string;
  expiresAt: Date;
};
