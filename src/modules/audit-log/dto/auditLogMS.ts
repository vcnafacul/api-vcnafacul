export interface AuditLogMS {
  entityType: string;
  entityId: string;
  changes: string;
  user: number;
  createdAt: Date;
}
