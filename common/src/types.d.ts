declare type ClassificationOptions = import('@huggingface/inference').Options;

declare type ImageClassificationArgs =
  import('@huggingface/inference').ImageClassificationArgs;

declare type HfImage = {
  split: string;
  label: string;
  fileName: string;
  origin: URL;
  content: Blob;
};

declare type HfUpload = HfImage & {
  path: string;
};
