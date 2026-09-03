---
name: rate-limiting-dos-prevention
description: Implementação de contenção de abuso de tráfego (algoritmos Token Bucket ou Leaky Bucket) por IP e API Key.
---

# Rate Limiting & Traffic Abuse Defense (DoS Prevention)

Implementação de contenção de abuso de tráfego (algoritmos Token Bucket ou Leaky Bucket) por IP e API Key.

## Overview
Técnicas de proteção contra abusos de requisição, ataques de negação de serviço (DoS) e raspagem automatizada através de limitação de taxa em camadas.

## Guidelines & Principles
1. **Multi-Tier Rate Limiting**: Limitar por endereço IP, por API Key autenticada e por endpoint sensível (ex: login, checkout, chaos).
2. **Token Bucket Algorithm**: Permitir picos controlados mantendo vazão sustentável a longo prazo.
3. **Standard Response Headers**: Emitir headers RFC padrão de cota (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).
4. **HTTP 429 Responses**: Responder com payload estruturado e header `Retry-After` orientando clientes legítimos.
