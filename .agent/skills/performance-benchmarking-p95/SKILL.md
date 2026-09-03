---
name: performance-benchmarking-p95
description: Cálculo e instrumentação matemática de percentis de latência (p50, p90, p95, p99), error rate e vazão de requisições por segundo (RPS).
---

# Performance Benchmarking & Latency Percentiles (p95/p99)

Cálculo e instrumentação matemática de percentis de latência (p50, p90, p95, p99), error rate e vazão de requisições por segundo (RPS).

## Overview
Instrumentação de métricas de telemetria e análise estatística de desempenho de APIs, calculando percentis de cauda (`p95`, `p99`), médias geométricas e throughput (RPS).

## Guidelines & Principles
1. **Mathematical Accuracy**: Calcular percentis ordenando amostras de latência com indexação precisa (`latencies[Math.floor(length * 0.95)]`).
2. **High-Resolution Timers**: Utilizar `performance.now()` ou `process.hrtime.bigint()` para medição de latência na escala de sub-milissegundos.
3. **SLA Compliance Thresholds**: Sinalizar violações de SLA caso `p95` ultrapasse o tempo limite contratado (ex: 250ms em pagamentos, 500ms em queries analíticas).
4. **Throughput & Error Rate**: Correlacionar latência com volume de requisições por segundo (RPS) e taxa de erro global.
