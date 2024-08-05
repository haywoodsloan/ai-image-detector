declare type ContentScriptContext = import('wxt/client').ContentScriptContext;
declare type ShadowRootContentScriptUi<T = void> =
  import('wxt/client').ShadowRootContentScriptUi<T>;

declare type ActionType =
  typeof import('./entrypoints/background/actions/base').BaseAction;

declare type BackgroundTaskReturn = {
  result?: any;
  error?: any;
};
