declare type ElementHandle<T extends Node = Element> =
  import('puppeteer').ElementHandle<T>;

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
  content: URL;
};
