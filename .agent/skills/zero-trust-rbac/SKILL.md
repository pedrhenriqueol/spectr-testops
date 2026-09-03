---
name: zero-trust-rbac
description: Controle de acesso por funções com validação estrita de escopo em claims JWT e isolamento em nível de registro/rota.
---

# Zero-Trust Role-Based Access Control (RBAC)

Controle de acesso por funções com validação estrita de escopo em claims JWT e isolamento em nível de registro/rota.

## Overview
Arquitetura de segurança Zero-Trust e autorização granular baseada em papéis (RBAC) para APIs e portais corporativos.

## Guidelines & Principles
1. **Scope & Claims Validation**: Cada token JWT deve transportar escopos explícitos (`merchant:read`, `transact:write`) validados antes da execução da rota.
2. **Tenant Isolation**: Toda query ao banco deve ser estritamente encapsulada pelo identificador da organização/workspace do usuário autenticado.
3. **Short-Lived Tokens**: JWTs de acesso com expiração curta (15 minutos) e mecanismo de renovação segura.
4. **Immutable Audit Trail**: Registrar no log imutável todas as tentativas de acesso com privilégio insuficiente (HTTP 403).
