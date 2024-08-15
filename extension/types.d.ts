import('common/types.d.ts');

declare type WxtStorageItem<T> = import('wxt/storage').WxtStorageItem<T, {}>;
declare type ContentScriptContext = import('wxt/client').ContentScriptContext;
declare type ShadowRootContentScriptUi<T = void> =
  import('wxt/client').ShadowRootContentScriptUi<T>;

declare type ActionType =
  typeof import('./entrypoints/background/actions/base').BaseAction;

declare type ApiError = import('./entrypoints/background/actions/api').ApiError;

declare type UserAuth = {
  authId: string;
  userId: string;
  accessToken: string;
  verification: 'pending' | 'verified';
  verificationSocket: string;
  expiresAt: Date;
  email: string
};

declare type ImageAnalysis = {
  artificial: number;
  scoreType: 'user' | 'detector' | 'vote';
  voteType?: number;
};

declare type ImageVote = {
  imageHash: string;
  userId: ObjectId;
  voteLabel: LabelType;
  changedAt: Date;
};
