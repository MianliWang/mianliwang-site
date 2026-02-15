export const AMA_NAME_MAX_LENGTH = 60;
export const AMA_EMAIL_MAX_LENGTH = 254;
export const AMA_MESSAGE_MAX_LENGTH = 1500;
export const AMA_STORED_MESSAGES_LIMIT = 200;

export type AmaMessage = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
};

export type AmaStoredMessage = AmaMessage & {
  email: string;
};

export type AmaCreateInput = {
  name: string;
  email: string;
  message: string;
};
