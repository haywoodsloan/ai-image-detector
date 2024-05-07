declare type ElementHandle<T> = import('puppeteer').ElementHandle<T>;

declare interface ValidationResult {
  isValid: boolean;
  error?: any;
}

declare interface ValidatedUpload {
  path: string;
  content: Blob;
}

declare interface Upload {
  path: string;
  content: URL;
}
