---
name: chaos-engineering-resilience
description: Injeção de estresse em tempo de execução (latência induzida, jitter de rede, erros 5xx simulados e fallbacks).
---

# Chaos Engineering & Runtime Resilience

Injeção de estresse em tempo de execução (latência induzida, jitter de rede, erros 5xx simulados e fallbacks).

## Overview
Metodologias práticas e instrumentação de engenharia do caos para validar a tolerância a falhas de sistemas distribuídos e microsserviços sob condições adversas controladas.

## Guidelines & Principles
1. **Fault Injection Strategy**: Injetar latência adaptativa (`simulate-delay`), jitter estocástico e códigos de erro de infraestrutura (`500`, `503`, `429`) de forma programável.
2. **Blast Radius Control**: Garantir que as simulações de falha fiquem isoladas no ambiente de testes sem contaminar dados de produção.
3. **Graceful Degradation**: O front-end e os microsserviços devem exibir fallbacks resilientes, retry visual e mensagens claras de estado offline.
4. **Recovery Verification**: Auditar a capacidade do sistema de recuperar o estado operacional pleno imediatamente após o cessamento da injeção de caos.
