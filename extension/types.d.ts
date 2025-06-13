import('common/types.d.ts');

declare type ModelRef<T> = import('vue').ModelRef<T>;
declare type VuePlugin = import('vue').Plugin;

declare type ActionType =
  typeof import('./entrypoints/background/actions/base').BaseAction;

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

declare type PositionType =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

declare type LocationStrategyData = {
  contentEl: Ref<HTMLElement | undefined>;
  target: Ref<HTMLElement | [x: number, y: number] | undefined>;
};

declare type UserSettings = {
  autoCheck: boolean;
  autoCheckPrivate: boolean;

  uploadImages: boolean;
  uploadImagesPrivate: boolean;

  indicatorPosition: PositionType;
  disabledSites: string[];
};
