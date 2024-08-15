export interface HistoryQuestionDTOOutput {
  user: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: Date;
  history: AuditLogMSDTO[];
}

export interface AuditLogMSDTO {
  user: { id: number; name: string; email: string };
  entityId: string;
  changes: string;
  entityType: string;
  createdAt: Date;
}
