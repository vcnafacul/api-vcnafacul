export type MessageHandler = (
  id: string,
  fields: Record<string, string>,
) => Promise<void>;
