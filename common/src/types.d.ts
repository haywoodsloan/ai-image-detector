declare type ClassificationOptions = import('@huggingface/inference').Options;

declare type ImageClassificationArgs =
  import('@huggingface/inference').ImageClassificationArgs;

declare type ValidationResult = {
  isValid: boolean;
  error?: any;
};

declare type ValidatedUpload = {
  path: string;
  content: Blob;
};

declare type Upload = {
  path: string;
  content: URL | Buffer;
};
