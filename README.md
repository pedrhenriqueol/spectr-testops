# Spectr TestOps

Workbench de testes HTTP inspirado no Postman, com coleções de requisições, execução individual ou sequencial, validação de contratos, métricas de latência e laboratório de caos local.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Fastify 4, Prisma 5 e SQLite.

## Desenvolvimento local

Requisitos: Node.js 20 ou superior, npm e acesso a `registry.npmjs.org` e `binaries.prisma.sh`. O SQLite é um arquivo local; não é necessário um servidor de banco separado.

```bash
cd server
cp .env.example .env # apenas se o arquivo ainda não existir
npm ci
npm run prisma:generate
# Em instalações novas, crie o arquivo SQLite vazio se ele ainda não existir:
[ -e prisma/dev.db ] || touch prisma/dev.db
npm run prisma:push
npm run seed
npm run dev
```

O seed é opcional e idempotente: cria duas coleções locais, preservando coleções, alterações e execuções existentes. Não executa chamadas HTTP. A demonstração intermitente permanece desativada para que as coleções iniciais sejam determinísticas. O caminho `prisma/dev.db` acima corresponde à `DATABASE_URL` padrão; ajuste-o se usar outro banco.

Em outro terminal:

```bash
cd client
npm ci
npm run dev
```

Portas padrão: **3335** para o backend e **5173** para o Vite. O cliente usa `http://localhost:3335/api/v1` por padrão.

### Variáveis

| Local | Variável | Uso / padrão |
|---|---|---|
| `server/.env` | `PORT` | Porta HTTP: `3335` |
| `server/.env` | `DATABASE_URL` | SQLite: `file:./dev.db`, relativo ao schema Prisma |
| `server/.env` | `CLIENT_URL` | Origem CORS da interface: `http://localhost:5173` |
| `server/.env` | `NODE_ENV` | `development`, `test` ou `production` |
| `client/.env` | `VITE_API_URL` | Endereço do backend; aceita URL raiz, `/api` ou `/api/v1` |

`VITE_API_URL` é lida pelo Vite ao iniciar/buildar. Se usar `127.0.0.1` na interface, ajuste `CLIENT_URL` para essa origem. Não adicione credenciais aos arquivos versionados.

Em ambientes com cache npm fora das permissões de escrita, use `npm ci --cache /workspace/.npm-cache`. Se a rede bloquear o Prisma, libere `binaries.prisma.sh` nas configurações; mantenha TLS e verificação de checksum habilitados.

## Fluxo de uso

1. Crie uma coleção com a Base URL da API que deseja testar.
2. Adicione requisições com método, caminho, status esperado e limite de latência.
3. Selecione uma requisição e use **Send** ou Enter na barra de URL.
4. Use **Executar coleção** para executar os casos ativos na ordem configurada e persistir as asserções.
5. Consulte o histórico e exporte relatórios JSON/CSV após uma execução.

O seletor de ambientes controla o endereço enviado ao backend. **URL da coleção** preserva o endereço salvo; **Local** aponta ao backend Spectr configurado; **Staging** é um endereço de exemplo que requer infraestrutura própria. Caminhos HTTP(S) absolutos mantêm seu próprio destino. A alteração de ambiente não modifica a coleção no banco.

Não há respostas HTTP ou histórico fabricados como fallback. Uma falha de conexão é exibida como erro; uma lista vazia é apresentada como vazia.

## Motor de testes

Um caso é aprovado quando **status HTTP, limite de latência e contrato configurado** passam. A latência inclui a leitura completa do corpo. O timeout HTTP de 15 segundos também cobre essa leitura.

O validador implementa um **subconjunto de JSON Schema**: `type` (incluindo `integer`), `required`, `properties`, `items` e schemas booleanos. Não equivale a uma implementação completa de JSON Schema/OpenAPI: `$ref`, `format`, `enum`, composição e importação OpenAPI ainda não são suportados. A interface mostra headers, mas não executa asserções automáticas de segurança sobre eles.

As execuções sequenciais podem reaproveitar tokens obtidos de respostas de autenticação. Headers globais e por requisição são combinados no servidor. Os detalhes de uma requisição isolada são retornados diretamente; somente execuções de coleção alimentam o histórico.

Os percentis usam **nearest rank**, sobre as amostras de cada coleção:

```text
percentil(p) = sortedLatencies[ceil(N × p / 100) − 1]
```

Com poucas amostras, p95 e p99 frequentemente coincidem. Esses números não substituem um teste de carga. O Chaos Lab mede uma chamada por ação e não apresenta multiplicadores arbitrários como percentis.

## API

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/health` | Disponibilidade do processo HTTP |
| GET | `/api/v1/suites` | Coleções e casos; filtro opcional `workspaceId` |
| POST | `/api/v1/suites` | Cria coleção: `name`, `baseUrl`, `description?`, `headers?`, `workspaceId?` |
| PATCH | `/api/v1/suites/:id` | Atualiza nome, descrição ou Base URL |
| DELETE | `/api/v1/suites/:id` | Remove coleção e dados associados por cascata |
| POST | `/api/v1/suites/:id/cases` | Adiciona caso de teste |
| POST | `/api/v1/cases/:id/run` | Executa caso isolado; body opcional `{ "baseUrl": "http://..." }` |
| POST | `/api/v1/suites/:id/run` | Executa coleção e retorna resultado final, incluindo `runId` |
| GET | `/api/v1/runs` | Histórico; `limit` entre 1 e 100 e `workspaceId` opcional |
| GET | `/api/v1/runs/:id` | Execução com asserções |
| GET | `/api/v1/metrics/overview` | Contagens e médias das últimas 30 execuções; `workspaceId` opcional |
| GET/POST | `/api/v1/chaos/echo` | Eco de método, headers e corpo |
| GET/POST | `/api/v1/chaos/simulate-delay?delay=80` | Atraso de 0 a 30000 ms; também aceita body `{ "delay": 80 }` |
| GET/POST | `/api/v1/chaos/simulate-error?code=503` | Código de erro injetado entre 400 e 599 |
| GET/POST | `/api/v1/chaos/simulate-flaky` | Retorna HTTP 200 ou 500 aleatoriamente |

As rotas Chaos aceitam outros métodos HTTP além de GET/POST. Erros de validação retornam HTTP 400 com `message` e `errors`; recursos ausentes retornam 404. O formato de erro é próprio da aplicação.

## Validação

```bash
cd server
npm run build
npm run test:unit
npm test

cd ../client
npm run build
```

`npm test` prepara um SQLite temporário exclusivo e executa testes de contratos, percentis, runner HTTP e rotas. Não altera o banco de desenvolvimento e não acessa a API PayStream. Requer os engines Prisma instalados normalmente. O cenário de timeout leva aproximadamente 15 segundos. `test:unit` verifica contratos e percentis sem precisar de banco.

## Limites atuais e evolução

O sistema atual destina-se ao desenvolvimento em ambiente confiável. Há filtros por workspace, mas **não há autenticação/autorização de usuários nem isolamento de tenants**. As rotas de execução fazem chamadas HTTP aos destinos configurados. Antes de disponibilizar uma instalação multiusuário, são necessários autenticação, autorização por workspace e política de destinos de saída. CORS e rate limit não substituem esses controles.

O histórico é persistido em SQLite e pode ser removido por cascata; não é um ledger imutável. Execuções são síncronas; filas, execução em background, cancelamento no servidor e streaming são evoluções futuras. O cancelamento no navegador interrompe a espera do cliente, mas o servidor pode continuar até concluir ou atingir o timeout.

Consulte [a análise do sistema e o plano de evolução visual](docs/ANALISE_SISTEMA.md) para os achados, critérios de fidelidade ao Postman e prioridades técnicas.
