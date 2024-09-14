export interface HistoryQuestionDTOOutput {
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  history: AuditLogMSDTO[];
}

export interface AuditLogMSDTO {
  user: { id: string; name: string; email: string };
  entityId: string;
  changes: string;
  entityType: string;
  createdAt: Date;
}
