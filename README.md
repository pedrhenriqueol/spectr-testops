# Spectr TestOps

Workbench de testes HTTP inspirado no Postman, com contas de usuário, workspaces isolados, editor de requisições, execução individual ou sequencial, contratos de resposta, métricas de latência e laboratório de caos local.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Fastify 4, Prisma 5 e SQLite. Documentação atualizada em **24/10/2026**.

## Desenvolvimento local

Use **Node.js 22** e npm; os dois jobs de CI usam essa versão. A instalação precisa de acesso a `registry.npmjs.org` e `binaries.prisma.sh`. SQLite usa um arquivo local e dispensa um serviço de banco separado.

No checkout existente, prepare o backend:

```bash
cd server
[ -e .env ] || cp .env.example .env
npm ci
npm run prisma:generate
# Corresponde à DATABASE_URL padrão; não sobrescreve um banco existente.
[ -e prisma/dev.db ] || touch prisma/dev.db
npm run prisma:push
npm run dev
```

`prisma:push` sincroniza o schema, incluindo as tabelas de usuários, sessões e associações de workspace. Para uma instalação existente, preserve um backup do SQLite antes de atualizar o schema. Ajuste o caminho do arquivo se usar outra `DATABASE_URL`.

Em outro terminal:

```bash
cd client
npm ci
npm run dev
```

O backend usa a porta **3335**, e o Vite usa **5173**. O cliente acessa `http://localhost:3335/api/v1` por padrão. Use o mesmo hostname nos dois processos durante o desenvolvimento; `localhost` e `127.0.0.1` são destinos distintos para cookies e para a política de origem.

Abra a interface, selecione **Criar conta** e cadastre nome, e-mail e uma senha de 12 a 128 caracteres. O cadastro já inicia a sessão e cria um workspace próprio. Não existe usuário ou senha padrão.

### Variáveis de ambiente

| Local | Variável | Uso / padrão |
|---|---|---|
| `server/.env` | `PORT` | Porta HTTP: `3335` |
| `server/.env` | `DATABASE_URL` | SQLite: `file:./dev.db`, relativo ao schema Prisma |
| `server/.env` | `CLIENT_URL` | Origem da interface permitida em CORS e operações de escrita: `http://localhost:5173` |
| `server/.env` | `NODE_ENV` | `development`, `test` ou `production`; produção exige cookies Secure |
| `server/.env` | `SESSION_SAME_SITE` | `lax` por padrão; `none` para uma interface hospedada em outro site |
| `server/.env` | `SESSION_SECURE` | `true` ou `false`; padrão `true` em produção e `false` nos demais ambientes |
| `server/.env` | `TARGET_ALLOWED_HOSTS` | Lista opcional de hostnames exatos separados por vírgula; restringe os destinos de saída |
| `client/.env` | `VITE_API_URL` | Endereço do backend; aceita URL raiz, `/api` ou `/api/v1` |

`VITE_API_URL` é lida ao iniciar/buildar o cliente. Variáveis e credenciais de execução não devem ser adicionadas a arquivos versionados. O ambiente pode fornecer `HTTP_PROXY`, `HTTPS_PROXY` e `NO_PROXY`; o cliente HTTP do motor respeita essas configurações.

Se o cache npm padrão não tiver permissão de escrita, use `npm ci --cache /workspace/.npm-cache`. Se a rede bloquear o Prisma, libere `binaries.prisma.sh` nas configurações, preservando TLS e a verificação de checksum.

### Cookies, origem e publicação

A sessão dura até sete dias e usa o cookie `spectr_session`, com **HttpOnly**, caminho `/api/v1` e **SameSite=Lax** por padrão. O banco armazena o hash do token de sessão; o frontend envia o cookie com `withCredentials` e não o grava em `localStorage`. Logout revoga a sessão atual no servidor.

Frontend e API em portas diferentes do mesmo site funcionam com `lax`, desde que `CLIENT_URL` corresponda à origem da interface. Em produção, sirva a API por HTTPS. Para uma implantação em sites diferentes, configure, por exemplo:

```ini
# Backend: origem exata da interface, sem wildcard
NODE_ENV=production
CLIENT_URL=https://app.example.com
SESSION_SAME_SITE=none
SESSION_SECURE=true
```

No build da interface, configure `VITE_API_URL` com o endereço HTTPS real da API. `SameSite=None` exige cookies Secure e não contorna bloqueios de cookies de terceiros do navegador; hospedar frontend e API no mesmo site evita essa dependência.

A proteção contra CSRF combina cookies SameSite com verificação de `Origin` nas operações que alteram dados. Origens diferentes de `CLIENT_URL` são rejeitadas. Com `SESSION_SAME_SITE=none`, `Origin` é obrigatório nessas operações, inclusive para clientes HTTP externos. Não há endpoint de token CSRF separado.

### Bancos anteriores e seed

Workspaces e dados antigos são preservados. Um workspace sem associação de usuário **não é atribuído automaticamente a quem criar uma conta** e não fica exposto a novas contas. Não há fluxo de reivindicação ou convite nesta versão.

`npm run seed` continua disponível como preparação técnica opcional e idempotente de duas coleções locais. Não cria conta, não associa o workspace legado a um usuário e não executa chamadas HTTP. Por isso, não é necessário ao fluxo normal de cadastro. Para testar pela interface com uma conta nova, crie uma coleção própria com Base URL `http://localhost:3335/api/v1` e adicione `/chaos/echo`.

## Fluxo de uso

1. Entre na conta e escolha o workspace no seletor da barra superior. O mesmo seletor permite criar outro workspace próprio ou sair da conta.
2. Crie uma coleção com a Base URL da API e adicione uma requisição.
3. Edite nome, método, caminho relativo ou URL absoluta. A aba **Parâmetros** permite adicionar, editar e remover itens da query, preservando parâmetros repetidos.
4. Configure headers por chave/valor, body JSON, status esperado, limite de latência e schema de resposta nas abas do editor. Headers da requisição sobrescrevem os da coleção com o mesmo nome.
5. Use **Send** ou Enter para executar o rascunho atual sem salvá-lo. **Salvar** ou Ctrl/Cmd+S persiste as alterações; **Descartar** restaura o conteúdo salvo. JSON inválido e valores fora dos limites impedem salvar/enviar, preservando o rascunho para correção.
6. Use **Executar coleção** para executar os casos **salvos e ativos**, na ordem configurada, e persistir os resultados. Apenas salvar o rascunho altera o caso usado por essa execução.
7. Consulte o histórico e exporte relatórios JSON/CSV após uma execução. A exclusão de uma requisição pede confirmação e também remove suas asserções detalhadas vinculadas a execuções anteriores.

O body aceita JSON real, inclusive `false`, `0`, `null`, strings e arrays. Um campo vazio remove o payload; isso é diferente de enviar o JSON literal `null`. O contrato aceita um objeto JSON ou os schemas booleanos `true`/`false`; vazio remove o contrato. Nenhum rascunho de headers ou body é persistido em `localStorage`.

O seletor de ambientes controla a Base URL enviada ao motor. **URL da coleção** preserva o endereço salvo; **Local** usa a API Spectr configurada. **Staging** é um endereço de exemplo que requer infraestrutura própria e pode ser bloqueado pela política de destinos. Uma URL HTTP(S) absoluta mantém seu próprio destino. Trocar o ambiente não altera a coleção no banco.

Não há resultados de HTTP ou histórico fabricados como fallback. Falhas de conexão são apresentadas como erro; um histórico vazio permanece vazio. O laboratório de caos simula falhas somente nas rotas próprias do Spectr, sem injetar falhas em serviços externos.

## Login e isolamento por workspace

Coleções, casos, execuções e métricas exigem uma sessão válida. A interface envia `X-Workspace-Id`, e o servidor verifica a associação da conta ao workspace antes de consultar ou alterar seus recursos. Se o header não for enviado, a API seleciona o primeiro workspace associado à conta. Um filtro `workspaceId` no body/query precisa corresponder ao contexto autenticado; ele não concede acesso a outro workspace.

O cadastro e a criação de workspace estabelecem a associação `OWNER` da conta. É possível manter vários workspaces próprios. Convites, administração de membros, recuperação de senha e compartilhamento de coleções entre usuários ainda não têm fluxo implementado. O mecanismo de login do Spectr é separado de tokens de autenticação usados para testar APIs de destino.

## Motor de testes e política de destinos

Um caso é aprovado quando **status HTTP, limite de latência e contrato configurado** passam. A latência inclui a leitura completa da resposta. O timeout de 15 segundos cobre cada chamada HTTP, incluindo a leitura do corpo; uma autenticação auxiliar pode acrescentar outra chamada. Coleções são síncronas e sequenciais, portanto seu tempo total cresce com a quantidade de casos.

O validador implementa um **subconjunto de JSON Schema**: `type` (incluindo `integer`), `required`, `properties`, `items` e schemas booleanos. Não implementa JSON Schema/OpenAPI completo: `$ref`, `format`, `enum`, composição e importação OpenAPI não são suportados. Headers são inspecionáveis, mas não há asserções automáticas de segurança sobre eles.

Execuções sequenciais podem reaproveitar tokens recebidos de respostas de autenticação. Headers globais e por caso são combinados no servidor sem distinguir maiúsculas/minúsculas. A execução individual retorna seus detalhes diretamente; apenas execuções de coleção alimentam o histórico.

O cliente HTTP do motor permite HTTP/HTTPS, verifica os endereços resolvidos e os redirecionamentos e bloqueia destinos privados, reservados e de metadados em execução normal. A conexão direta usa o endereço validado, mantendo o hostname para Host/TLS. URLs com credenciais embutidas são rejeitadas. Ao mudar de origem em um redirect, headers de autenticação e cookies são removidos. O corpo de **resposta**, após descompressão quando aplicável, tem limite de **2 MiB**; há no máximo cinco redirecionamentos.

A exceção local permite apenas as rotas `/api/v1/chaos/echo`, `simulate-delay`, `simulate-error` e `simulate-flaky` no loopback e na porta do próprio backend. Ela não libera chamadas a outros serviços internos nem a outras rotas locais. `NODE_ENV=test` permite alvos privados para os testes isolados; não use esse modo em uma implantação de usuários.

O administrador pode restringir destinos por configuração, por exemplo:

```ini
TARGET_ALLOWED_HOSTS=api.example.com,status.example.com
```

Os nomes são exatos, sem protocolo, porta, caminho ou wildcard. Se a lista estiver preenchida, todos os destinos externos e hosts de redirecionamento precisam constar nela. A lista não libera endereços privados resolvidos normalmente. Se o DNS local falhar e houver proxy de saída configurado, o fallback de resolução pelo proxy só é permitido para hostnames explicitamente listados. Nesse caso, a resolução é delegada ao proxy: o administrador deve autorizar o hostname e controlar o destino efetivo nessa infraestrutura. A allowlist é configuração do servidor, não um campo enviado pelo usuário da API.

Os percentis usam **nearest rank**, sobre as amostras de cada coleção:

```text
percentil(p) = sortedLatencies[ceil(N × p / 100) − 1]
```

Com poucas amostras, p95 e p99 frequentemente coincidem. Esses números não substituem um teste de carga. O Chaos Lab mede uma chamada por ação e não transforma essa medida em percentis fictícios.

## API

As rotas abaixo usam o prefixo `/api/v1`, exceto `/health`. Nas rotas protegidas, envie o cookie de sessão. Para recursos de um workspace, envie também `X-Workspace-Id` quando quiser escolher explicitamente o contexto.

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/health` | Disponibilidade do processo HTTP; público |
| POST | `/auth/register` | Cria conta e workspace; body `{ name, email, password, workspaceName? }`; retorna sessão por cookie |
| POST | `/auth/login` | Inicia sessão; body `{ email, password }` |
| GET | `/auth/me` | Conta autenticada, workspaces associados e contexto atual |
| POST | `/auth/logout` | Revoga a sessão atual e remove o cookie |
| GET | `/workspaces` | Lista somente workspaces associados à conta |
| POST | `/workspaces` | Cria workspace próprio; body `{ name }` |
| GET | `/suites` | Lista coleções e casos do workspace selecionado |
| POST | `/suites` | Cria coleção: `{ name, baseUrl, description?, headers? }` |
| PATCH | `/suites/:id` | Atualiza nome, descrição ou Base URL |
| DELETE | `/suites/:id` | Remove coleção e dados associados por cascata |
| POST | `/suites/:id/cases` | Cria requisição com método, caminho, expectativas e JSON opcionais |
| PATCH | `/suites/:id/cases/:caseId` | Atualiza campos enviados; omitidos são preservados; retorna `{ testCase }` |
| DELETE | `/suites/:id/cases/:caseId` | Remove requisição e asserções vinculadas; retorna 204 |
| POST | `/cases/:id/run` | Executa rascunho isolado sem persistir; body `{ baseUrl?, overrides? }` |
| POST | `/suites/:id/run` | Executa casos salvos/ativos; body opcional `{ baseUrl? }`; retorna resultado final e `runId` |
| GET | `/runs` | Histórico do workspace; `limit` entre 1 e 100 |
| GET | `/runs/:id` | Execução com asserções, dentro do workspace selecionado |
| GET | `/metrics/overview` | Contagens e médias das últimas 30 execuções do workspace |
| GET/POST | `/chaos/echo` | Simulador público: eco de método, headers e corpo |
| GET/POST | `/chaos/simulate-delay?delay=80` | Simulador público: atraso de 0 a 30000 ms; aceita body `{ delay: 80 }` |
| GET/POST | `/chaos/simulate-error?code=503` | Simulador público: erro injetado entre 400 e 599 |
| GET/POST | `/chaos/simulate-flaky` | Simulador público: HTTP 200 ou 500 aleatório |

As rotas Chaos aceitam também os demais métodos HTTP suportados pelo módulo. Validação inválida retorna 400 com `message` e `errors`; ausência de sessão retorna 401; acesso a workspace não associado retorna 403; um recurso fora do contexto selecionado retorna 404. O formato de erro é próprio da aplicação.

### Atualização persistente e execução de rascunho

O PATCH de caso aceita `name`, `method`, `path`, `headers`, `body`, `expectedStatus`, `maxLatencyMs`, `expectedSchema`, `active` e `orderIndex`. Os métodos são `GET`, `POST`, `PUT`, `PATCH` e `DELETE`; status deve ser inteiro entre 100 e 599, e latência entre 1 e 300000 ms. `orderIndex` é um inteiro não negativo.

Em `headers`, `body` e `expectedSchema`, `null` limpa o valor salvo; campos omitidos permanecem intactos. Na API, `headers` recebe um objeto de strings, e `expectedSchema` recebe um objeto ou booleano. O editor usa texto JSON no rascunho e converte esses campos ao montar o payload. Para enviar o JSON literal `null` como body, use a string `"null"`, em vez do valor `null` que significa limpar.

Exemplo de execução individual com overrides, sem alterar o caso salvo:

```json
{
  "baseUrl": "http://localhost:3335/api/v1",
  "overrides": {
    "method": "POST",
    "path": "/chaos/echo?source=draft",
    "headers": { "X-Scenario": "preview" },
    "body": "{\"enabled\":false,\"count\":0}",
    "expectedStatus": 200,
    "maxLatencyMs": 1500,
    "expectedSchema": { "type": "object", "required": ["body"] }
  }
}
```

`overrides` aceita apenas os campos de execução do exemplo; nome, ordem e flag `active` pertencem ao PATCH persistente. Uma execução individual não cria um registro no histórico.

## Validação e CI

```bash
cd server
npm run prisma:generate
npm run build
npm run test:unit
npm test

cd ../client
npm run build
```

`npm test` cria um SQLite temporário exclusivo e executa testes de contratos, percentis, runner HTTP, autenticação, isolamento e rotas. O runner configura seu próprio banco e o remove ao terminar; não usa o banco de desenvolvimento nem o seed, e não cria contas em uma instalação real. Requer os engines Prisma instalados normalmente. O cenário de timeout leva aproximadamente 15 segundos. `test:unit` verifica contratos e percentis sem banco.

O workflow [CI](.github/workflows/ci.yml) contém dois jobs independentes em Node.js 22: backend com `npm ci`, geração Prisma, build e testes; frontend com `npm ci` e build/typecheck. Executa em pushes para `main` e pull requests, com permissões de leitura do repositório. Não depende de secrets nem adiciona uma infraestrutura de browser à CI. O arquivo do workflow define essas verificações; seu resultado no GitHub deve ser consultado na execução correspondente.

## Limites atuais

O histórico usa SQLite e pode perder detalhes por exclusão em cascata; não é um ledger imutável. Não há fila, execução em background, cancelamento no servidor ou streaming. Cancelar no navegador interrompe a espera do cliente, mas a chamada já enviada ao destino pode continuar até concluir ou atingir o timeout.

A fidelidade visual ao Postman, a organização dos componentes e as evidências do redesign estão em [Redesign do workbench](docs/REDESIGN_POSTMAN.md). A [análise do sistema](docs/ANALISE_SISTEMA.md) registra os achados e as prioridades de evolução.
