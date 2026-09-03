---
name: event-driven-architecture
description: Padrões desacoplados com mensageria assíncrona, filas de retentativa, dead-letter queues e processamento orientado a eventos.
---

# Event-Driven Architecture & Asynchronous Messaging

Padrões desacoplados com mensageria assíncrona, filas de retentativa, dead-letter queues e processamento orientado a eventos.

## Overview
Arquitetura de sistemas orientados a eventos, entrega de webhooks garantida, filas de retentativa assíncrona e processamento desacoplado.

## Guidelines & Principles
1. **Idempotent Consumers**: Consumidores de eventos e webhooks devem ser inerentemente idempotentes contra mensagens duplicadas.
2. **Exponential Backoff**: Políticas de retentativa com backoff exponencial e jitter para evitar o problema do "thundering herd".
3. **Dead-Letter Queues (DLQ)**: Mensagens com falha repetida após N tentativas devem ser isoladas em DLQ para inspeção e auditoria.
4. **Event Versioning**: Schemas de evento versionados (`payment.settled.v1`) para evolução retrocompatível de contratos.
