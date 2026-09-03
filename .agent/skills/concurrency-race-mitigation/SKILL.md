---
name: concurrency-race-mitigation
description: Tratamento de condições de corrida, operações atômicas no PostgreSQL/Prisma e travas determinísticas (optimistic/pessimistic locking).
---

# Concurrency & Race Condition Mitigation

Tratamento de condições de corrida, operações atômicas no PostgreSQL/Prisma e travas determinísticas (optimistic/pessimistic locking).

## Overview
Padrões de engenharia para eliminar condições de corrida, double-spending e escritas conflitantes em sistemas transacionais de alta concorrência.

## Guidelines & Principles
1. **Atomic Ledger Updates**: Atualizações de saldo e estoque devem ser atômicas no banco (`UPDATE accounts SET balance = balance + 100 WHERE id = ...`).
2. **Idempotency Keys**: Chaves de idempotência únicas armazenadas com TTL (Redis ou PostgreSQL) para deduplicar requisições em trânsito.
3. **Optimistic Locking**: Controle de versão (`version` column) para rejeitar updates concorrentes desatualizados.
4. **Isolation Levels**: Configurar níveis de isolamento adequados (`READ COMMITTED` ou `SERIALIZABLE`) para transações críticas de pagamento.
