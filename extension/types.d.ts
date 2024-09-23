import('common/types.d.ts');

declare type ModelRef<T> = import('vue').ModelRef<T>;

declare type WxtStorageItem<T> = import('wxt/storage').WxtStorageItem<T, {}>;
declare type ContentScriptContext = import('wxt/client').ContentScriptContext;
declare type ShadowRootContentScriptUi<T = void> =
  import('wxt/client').ShadowRootContentScriptUi<T>;

declare type ActionType =
  typeof import('./entrypoints/background/actions/base').BaseAction;

declare type ApiError = import('./api/base').ApiError;

declare type UserAuth = {
  _id: string;
  userId: string;
  accessToken: string;
  verification: 'pending' | 'verified';
  verificationSocket: string;
  expiresAt: Date;
  email: string;
};

declare type DetectorImageAnalysis = {
  artificial: number;
  scoreType: 'detector';
};

declare type VoteImageAnalysis = {
  artificial: number;
  scoreType: 'vote';
  voteCount: number;
};

declare type UserImageAnalysis = {
  artificial: number;
  scoreType: 'user';
  voteId: string;
};

declare type ImageAnalysis =
  | DetectorImageAnalysis
  | VoteImageAnalysis
  | UserImageAnalysis;

declare type ImageVote = {
  _id: string;
  imageHash: string;
  userId: ObjectId;
  voteLabel: LabelType;
  changedAt: Date;
};

declare type UserSettings = {
  autoCheck: boolean;
  autoCheckPrivate: boolean;

  uploadImages: boolean;
  uploadImagesPrivate: boolean;

  disabledSites: string[];
};
