---
name: resilient-http-client
description: Modelagem de clientes HTTP com backoff exponencial, timeout adaptativo e cancelamento assíncrono via AbortController.
---

# Resilient HTTP Client & Network Adapters

Modelagem de clientes HTTP com backoff exponencial, timeout adaptativo e cancelamento assíncrono via AbortController.

## Overview
Construção de clientes HTTP robustos e tolerantes a instabilidades de rede, com controle rígido de timeouts e cancelamento cooperativo.

## Guidelines & Principles
1. **Strict Timeouts**: Toda chamada externa deve possuir timeout determinístico via `AbortSignal.timeout(ms)` ou `AbortController`.
2. **Circuit Breaker Pattern**: Interromper chamadas imediatas contra serviços reconhecidamente em colapso temporário.
3. **Error Classification**: Diferenciar erros transitórios (503, timeout) passiveis de retry de erros determinísticos de cliente (400, 422).
4. **Telemetry Tagging**: Anexar headers de correlação (`X-Request-ID`, `X-Trace-ID`) para rastreamento distribuído ponta a ponta.
