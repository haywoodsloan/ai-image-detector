declare type Encoding = import('crypto').Encoding;

declare type TimeSpan = import('./utilities/TimeSpan').TimeSpan;

declare type ApiError = import('./utilities/error').ApiError;

declare type ClassificationOptions = import('@huggingface/inference').Options;

declare type ImageClassificationArgs =
  import('@huggingface/inference').ImageClassificationArgs;

declare type ImageClassificationOutput =
  import('@huggingface/tasks').ImageClassificationOutput;

declare type CommitData = import('@huggingface/hub').CommitData;

declare type SplitType =
  | typeof import('./utilities/huggingface.js').TrainSplit
  | typeof import('./utilities/huggingface.js').TestSplit;

declare type LabelType =
  | typeof import('./utilities/huggingface.js').AiLabel
  | typeof import('./utilities/huggingface.js').RealLabel;

declare type HfImage = {
  split: SplitType;
  label: LabelType;
  fileName: string;
  origin: URL;
  content: Blob;
};

declare type HfUpload = HfImage & {
  path: string;
};
