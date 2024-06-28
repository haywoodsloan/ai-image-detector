import('common/types.d.ts');

declare type HttpResponseInit = import('@azure/functions').HttpResponseInit;
declare type InvocationContext = import('@azure/functions').InvocationContext;
declare type HttpRequest = import('@azure/functions').HttpRequest;
declare type EmailMessage = import('@azure/communication-email').EmailMessage;

declare type WithId<T> = import('mongodb').WithId<T>;
declare type Collection<T> = import('mongodb').Collection<T>;

declare type VerificationStatus =
  | typeof import('./services/db/authColl.js').PendingVerification
  | typeof import('./services/db/authColl.js').VerificationComplete;

declare type VoteDocument = {
  imageHash: string;
  userId: string;
  voteLabel: LabelType;
  changedAt: Date;
};

declare type UserDocument = {
  emailHash: string;
  createdAt: Date;
  lastAccessAt: Date;
};

declare type AuthDocument = {
  userId: string;
  expiresAt: Date;
  accessToken: string;
  verification: { code: string; status: VerificationStatus };
};
