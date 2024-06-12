declare type ClassificationOptions = import('@huggingface/inference').Options;

declare type ImageClassificationArgs =
  import('@huggingface/inference').ImageClassificationArgs;

declare type Upload = {
  path: string;
  content: Blob;
};
