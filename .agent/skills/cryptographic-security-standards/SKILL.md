---
name: cryptographic-security-standards
description: Geração e auditoria de assinaturas HMAC-SHA256, rotação de segredos e prevenção contra timing attacks via comparações em tempo constante (crypto.timingSafeEqual).
---

# Cryptographic Security & Financial Integrity Standards

Geração e auditoria de assinaturas HMAC-SHA256, rotação de segredos e prevenção contra timing attacks via comparações em tempo constante (crypto.timingSafeEqual).

## Overview
Padrões de criptografia aplicada para integridade transacional, auditoria de payloads e prevenção contra ataques cibernéticos em sistemas financeiros.

## Guidelines & Principles
1. **Constant-Time Comparison**: Sempre utilizar `crypto.timingSafeEqual()` na validação de assinaturas e hashes para mitigar timing attacks.
2. **HMAC-SHA256 Signatures**: Assinar payloads de webhooks usando segredo compartilhado e chave canônica de timestamp (`t=...,v1=...`).
3. **Replay Attack Mitigation**: Validar timestamp de requisições assinadas, rejeitando deltas superiores a 300 segundos.
4. **Secret Management**: Segredos, chaves privadas e tokens de gateway devem trafegar exclusivamente via variáveis de ambiente seguras.
