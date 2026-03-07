# Grafo de dependências dos módulos

Este documento descreve a relação entre os módulos após a limpeza, para manter um grafo previsível e evitar “tudo mundo apontando pra tudo mundo”.

## Princípios aplicados

1. **Um módulo não redeclara providers de outro** – Se precisa de `UserService`, importa `UserModule` (que exporta `UserService`), em vez de colocar `UserService` em `providers`.
2. **Repositórios/serviços de domínio ficam no módulo do domínio** – Ex.: `LogPartnerRepository` é exportado por `PartnerPrepCourseModule`; `LogGeoRepository` por `GeoModule`.
3. **Ciclos são resolvidos com `forwardRef()`** – Ex.: `StudentCourseModule` ↔ `InscriptionCourseModule` e `CollaboratorModule` ↔ `PartnerPrepCourseModule`.

## Camadas (visão simplificada)

```
AppModule
├── EnvModule, CacheManagerModule, BlobModule (shared/globais)
├── UserModule, RoleModule (auth/usuário)
├── AuditLogModule, GeoModule (compartilhados por vários)
├── SimuladoModule (depende de User, AuditLog, Cache, Blob)
├── prepCourse:
│   ├── PartnerPrepCourseModule  ←→ CollaboratorModule (forwardRef)
│   ├── CollaboratorModule (User, Role, Simulado, Geo, forwardRef(PartnerPrepCourse))
│   ├── ClassModule (PartnerPrepCourse, User, Role, CoursePeriod)
│   ├── CoursePeriodModule (PartnerPrepCourse)
│   ├── StudentCourseModule (User, Collaborator, Class, PartnerPrepCourse, forwardRef(InscriptionCourse), Geo, VcnafaculForm, …)
│   └── InscriptionCourseModule (PartnerPrepCourse, forwardRef(StudentCourse))
└── attendance: AbsenceJustification, StudentAttendance, AttendanceRecord (User, Class, Collaborator quando necessário)
```

## Ciclos conhecidos (e como estão tratados)

| Ciclo | Tratamento |
|-------|------------|
| StudentCourseModule ↔ InscriptionCourseModule | `forwardRef(() => InscriptionCourseModule)` e `forwardRef(() => StudentCourseModule)` |
| CollaboratorModule ↔ PartnerPrepCourseModule | `forwardRef(() => PartnerPrepCourseModule)` e `forwardRef(() => CollaboratorModule)` |

## Módulos que exportam repositórios compartilhados

- **GeoModule**: `LogGeoRepository` (usado por PartnerPrepCourse, Collaborator, StudentCourse quando precisam de log geo).
- **PartnerPrepCourseModule**: `PartnerPrepCourseService`, `PartnerPrepCourseRepository`, `LogPartnerRepository`.
- **UserModule**: `UserService`, `UserRepository`, `RefreshTokenService`.
- **AuditLogModule**: `AuditLogService`, `AuditLogRepository` (usado por Geo, Simulado).

## Regra prática

- **Precisa de usuário/role?** → Importe `UserModule` e/ou `RoleModule`.
- **Precisa de algo do prep/parceiro?** → Importe o módulo correspondente (`PartnerPrepCourseModule`, `ClassModule`, etc.) e use os exports; não redeclare serviços/repositórios.
- **Aparecer ciclo?** → Use `forwardRef(() => OutroModule)` nos dois lados e evite dependências desnecessárias.
