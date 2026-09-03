---
name: database-indexing-optimization
description: Estruturação de índices compostos, resolução de gargalos N+1 e otimização de queries relacionais de alta frequência.
---

# Database Indexing & Query Optimization

Estruturação de índices compostos, resolução de gargalos N+1 e otimização de queries relacionais de alta frequência.

## Overview
Design de índices relacionais de alto desempenho, eliminação de gargalos N+1 em ORMs (Prisma) e elaboração de planos de execução eficientes.

## Guidelines & Principles
1. **Composite Indexes**: Criar índices cobrindo filtros frequentes ordenados pela seletividade (`@@index([workspaceId, createdAt(sort: Desc)])`).
2. **N+1 Query Elimination**: Usar `include` ou `select` explícitos no Prisma para evitar disparos de queries em loop.
3. **Pagination Strategy**: Adotar paginação baseada em cursor para tabelas densas, evitando custos proibitivos de `OFFSET`.
4. **Soft Deletion & Partitioning**: Estruturar flags de inativação e arquivamento de telemetria antiga sem degradar leituras em tempo real.
