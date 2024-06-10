
declare type VoteCollection = import('mongodb').Collection<VoteDocument>;
declare type UserCollection = import('mongodb').Collection<UserDocument>;

declare type VoteDocument = {
  hash: string;
  userId: string;
  voteClass: string;
  lastModify: Date;
};

declare type UserDocument = {
  userId: string;
  lastAccess: Date;
  createdAt: Date;
};