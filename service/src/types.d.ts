import('common/types.d.ts');

declare type HttpResponseInit = import('@azure/functions').HttpResponseInit;
declare type InvocationContext = import('@azure/functions').InvocationContext;
declare type HttpRequest = import('@azure/functions').HttpRequest;
declare type HttpHandler = import('@azure/functions').HttpHandler;
declare type EmailMessage = import('@azure/communication-email').EmailMessage;

declare type ObjectId = import('mongodb').ObjectId;
declare type WithId<T> = import('mongodb').WithId<T>;
declare type Collection<T> = import('mongodb').Collection<T>;

declare type VerificationStatus =
  | typeof import('./services/db/authColl.js').PendingVerification
  | typeof import('./services/db/authColl.js').VerificationComplete;

declare type VoteDocument = {
  imageHash: string;
  userId: ObjectId;
  voteLabel: LabelType;
  changedAt: Date;
};

declare type UserDocument = {
  emailHash: string;
  createdAt: Date;
  lastAccessAt: Date;
};

declare type AuthDocument = {
  userId: ObjectId;
  accessToken: string;
  verifyStatus: VerificationStatus;
  verifyCode?: string;
  verifySocket?: string;
  refreshedAt: Date;
  ttl: number;
};
