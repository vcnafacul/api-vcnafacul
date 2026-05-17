export type SenderType = 'student' | 'support';
export type ConversationStatus = 'open' | 'closed';
export type ClosedBy = 'student' | 'support' | null;

export interface ConversationMetadata {
  page: string;
  userAgent: string;
  device: 'mobile' | 'desktop';
  browser: string;
}
