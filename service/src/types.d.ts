declare type ImageCollection = import('mongodb').Collection<ImageDocument>;

declare type ImageDocument = {
  hash: string;
  lastModDate: Date;

  aiVotes?: number;
  realVotes?: number;

  imgClass?: string;
  detVer?: string;
};