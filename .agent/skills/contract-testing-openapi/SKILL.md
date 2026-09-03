---
name: contract-testing-openapi
description: Validação estrita de contratos OpenAPI/Swagger e schemas JSON estruturados sem tolerância a payloads corrompidos.
---

# Contract Testing & OpenAPI Validation

Validação estrita de contratos OpenAPI/Swagger e schemas JSON estruturados sem tolerância a payloads corrompidos.

## Overview
Domínio em validação formal e estrita de contratos de API utilizando especificações OpenAPI v3 e schemas JSON estruturados (Zod / JSON Schema). Garante que todas as requisições e respostas cumpram rigorosamente tipos, estruturas de campos obrigatórios, formatos e restrições.

## Guidelines & Principles
1. **Zero Payload Tolerance**: Respostas ou requisições que omitam campos requeridos ou contenham tipos incompatíveis devem falhar imediatamente nos testes de contrato.
2. **Schema Compilation**: Pré-compilar e cachear validadores JSON Schema para alta performance em tempo de execução.
3. **Drift Detection**: Detectar divergências entre a documentação viva OpenAPI e os endpoints implementados em produção.
4. **Zod Integration**: Em ecossistemas TypeScript/Node, usar inferência estrita de tipos (`z.infer<typeof schema>`) garantindo integridade de ponta a ponta.
