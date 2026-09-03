---
name: assertion-engine-design
description: Construção e validação sequencial de baterias de asserções (status code, tempo limite, headers obrigatórios e integridade estrutural).
---

# Assertion Engine Design & Test Runner Protocol

Construção e validação sequencial de baterias de asserções (status code, tempo limite, headers obrigatórios e integridade estrutural).

## Overview
Arquitetura de motores de asserção estritos para plataformas de TestOps e observabilidade, executando validações em cascata no padrão Postman (`pm.test`, `pm.expect`).

## Guidelines & Principles
1. **Chained Execution Protocol**: Executar asserções sequenciais preservando tokens de sessão dinâmicos entre passos de teste.
2. **Multi-Vector Checks**: Validar em cada ciclo: Status Code match, SLA latency compliance, headers de segurança e integridade de schema.
3. **Atomic Assertion Isolation**: Uma falha em asserção de payload não deve mascarar o registro da telemetria de latência real.
4. **Actionable Diagnostics**: Emitir mensagens de erro descritivas detalhando valor esperado vs retornado.
