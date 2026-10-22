export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * Cálculo estatístico determinístico de percentis de latência (p50, p90, p95, p99)
 * Utiliza o método Nearest Rank padronizado (NIST / Datadog / K6).
 */
export function calculatePercentiles(latencies: number[]): LatencyMetrics {
  if (!latencies || latencies.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;

  const getRankValue = (percentile: number) => {
    const rank = Math.ceil((percentile / 100) * n) - 1;
    return sorted[Math.max(0, Math.min(n - 1, rank))];
  };

  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    p50: getRankValue(50),
    p90: getRankValue(90),
    p95: getRankValue(95),
    p99: getRankValue(99),
    min: sorted[0],
    max: sorted[n - 1],
    avg: Math.round(sum / n)
  };
}

export interface ContractValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

/**
 * Validador recursivo de conformidade OpenAPI / JSON Schema.
 * Suporta objetos aninhados, arrays tipados, validação de tipos primitivos e campos obrigatórios.
 */
export function validateContractSchema(data: unknown, schema: unknown, path = 'root'): ContractValidationResult {
  if (schema === false) {
    return { valid: false, errorMessage: `Falha de contrato em '${path}': schema não permite nenhum valor.` };
  }
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return { valid: true, errorMessage: null };
  }

  const contract = schema as Record<string, unknown>;
  // 1. Validação de tipo de dado
  if (contract.type) {
    const expectedType = contract.type;
    const actualType = Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data;

    if (expectedType === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        return {
          valid: false,
          errorMessage: `Falha de contrato em '${path}': esperado 'integer', recebido '${actualType}' (${data}).`
        };
      }
    } else if (expectedType === 'number') {
      if (typeof data !== 'number' || !Number.isFinite(data)) {
        return {
          valid: false,
          errorMessage: `Falha de contrato em '${path}': esperado 'number', recebido '${actualType}'.`
        };
      }
    } else if (expectedType !== actualType) {
      return {
        valid: false,
        errorMessage: `Falha de contrato em '${path}': esperado '${expectedType}', recebido '${actualType}'.`
      };
    }
  }

  // 2. Validação de campos obrigatórios (required)
  if (contract.required && Array.isArray(contract.required)) {
    if (typeof data !== 'object' || data === null) {
      return {
        valid: false,
        errorMessage: `Falha de contrato em '${path}': esperado objeto para verificar campos obrigatórios.`
      };
    }

    for (const field of contract.required) {
      if (typeof field === 'string' && !Object.hasOwn(data, field)) {
        return {
          valid: false,
          errorMessage: `Campo obrigatório ausente no contrato: '${path === 'root' ? field : `${path}.${field}`}'.`
        };
      }
    }
  }

  // 3. Validação de propriedades aninhadas (properties)
  if (contract.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const [propName, propSchema] of Object.entries(contract.properties as Record<string, unknown>)) {
      if (Object.hasOwn(data, propName)) {
        const subResult = validateContractSchema(
          (data as Record<string, unknown>)[propName],
          propSchema,
          path === 'root' ? propName : `${path}.${propName}`
        );
        if (!subResult.valid) {
          return subResult;
        }
      }
    }
  }

  // 4. Validação de arrays tipados (items)
  if (contract.items !== undefined && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const itemResult = validateContractSchema(data[i], contract.items, `${path}[${i}]`);
      if (!itemResult.valid) {
        return itemResult;
      }
    }
  }

  return { valid: true, errorMessage: null };
}
