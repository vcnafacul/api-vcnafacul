export interface AuditLogMS {
  entityType: string;
  entityId: string;
  changes: string;
  user: string;
  createdAt: Date;
}
