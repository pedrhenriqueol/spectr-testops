# Sessão persistente e retorno ao login

Quando cadastro/login retorna sucesso, mas as primeiras consultas do workspace recebem `401`, a interface não pode considerar a sessão estabelecida apenas pelo corpo da resposta de autenticação. O navegador também precisa aceitar e reenviar o cookie `spectr_session`. A confirmação ocorre por uma consulta autenticada a `GET /api/v1/auth/me` antes de abrir o workspace.

O cadastro pode ter sido concluído mesmo quando o navegador recusa o cookie. Nesse caso, a conta existe: corrija a configuração da sessão e use **Entrar**. Repetir o cadastro com o mesmo e-mail retorna conflito.

## Identificar a origem

No painel Network do navegador, observe os status de `auth/register` ou `auth/login`, `auth/me` e das consultas iniciais de coleções/histórico. Na aba de cookies da resposta, o navegador informa se bloqueou o cookie e o motivo. Não copie valores de cookies, senhas ou cabeçalhos de autenticação para relatórios.

| Evidência | Verificação |
| --- | --- |
| Login/cadastro bem-sucedido, seguido de `auth/me` com `401` | Cookie recusado, não enviado, expirado ou sessão indisponível na instância consultada |
| Navegador aponta `SameSite=Lax` em chamada entre sites diferentes | Publique a API no mesmo site; se precisar de sites distintos, configure `SameSite=None; Secure` e HTTPS |
| Cookie marcado como terceiro e bloqueado | `SameSite=None` sozinho não resolve: use API no mesmo site ou proxy na origem da interface |
| Erro de CORS/conexão | `CLIENT_URL` precisa ser a origem exata da interface; `VITE_API_URL` precisa apontar para a API correta, por HTTPS em produção |
| `403` ao alterar dados | Confira a origem permitida e a associação do usuário ao workspace; esse status não indica expiração da sessão |
| Sessão funciona em algumas requisições e falha em outras | Todas as instâncias precisam consultar a mesma base persistente de usuários/sessões |

As respostas de sessão e dados privados usam `Cache-Control: no-store`. O proxy/CDN deve preservar esse cabeçalho e não armazenar respostas autenticadas.

## Proxy pela mesma origem na Vercel

O cliente usa `/api/v1` na mesma origem por padrão. A função Node `client/api/v1/[...path].js` encaminha as chamadas ao destino fixo configurado no ambiente da Vercel. A função preserva `Cookie`, `Set-Cookie`, `Origin`, `X-Workspace-Id` e a política de cache; não segue redirecionamentos do backend. O destino nunca vem de parâmetro da requisição.

Na Vercel, mantenha o diretório raiz do projeto em `client` e configure a variável **de execução** da função com o domínio real da API:

```ini
# Vercel: substitua pelo backend real, acessível por HTTPS
SPECTR_API_URL=https://api.example.com
```

Também são aceitos os sufixos `/api` e `/api/v1`. Instalações existentes podem continuar usando uma `VITE_API_URL` absoluta como destino da função, se `SPECTR_API_URL` não estiver definida. Não é necessário definir `VITE_API_URL` para usar o proxy. Se ela estiver definida como `/api/v1`, configure também `SPECTR_API_URL` absoluta: uma função não pode encaminhar chamadas para si mesma.

No backend, preserve a origem pública exata da interface e a base persistente:

```ini
NODE_ENV=production
CLIENT_URL=https://spectr-testops.vercel.app
SESSION_SAME_SITE=lax
SESSION_SECURE=true
# DATABASE_URL deve apontar para o SQLite em armazenamento persistente do servidor
```

Depois de alterar variáveis/build ou adicionar a função, publique um novo deploy. `client/vercel.json` procura primeiro as funções/arquivos e exclui `/api` do fallback da SPA. Sem configuração válida, a função devolve `502` JSON, sem expor a URL, credenciais ou detalhes internos. Confirme que `/api/v1/auth/me` responde JSON, não o HTML da aplicação; sem login, `401` é esperado.

O proxy não fabrica o cabeçalho `Origin` para chamadas sem origem e não troca uma origem estrangeira por uma confiável. A validação CSRF do backend continua valendo. O cookie continua HttpOnly; não é necessário gravar tokens em `localStorage` nem habilitar cookies de terceiros para esse fluxo.

O proxy tem limite de espera de 120 segundos; a plataforma também aplica o limite de duração da função do plano utilizado. Coleções são executadas de forma síncrona, e sua duração total precisa caber nesses limites.

Para uma instalação que precisa falar diretamente com uma API em outro site, use explicitamente `VITE_API_TRANSPORT=direct` com `VITE_API_URL` absoluta. Consulte `SESSION_SAME_SITE`, `SESSION_SECURE` e `CLIENT_URL` no [README](../README.md#cookies-origem-e-publicação). Essa opção depende também da política de cookies do navegador.

## Conta criada passa a retornar credenciais inválidas

Esse sintoma precisa ser investigado separadamente da aceitação do cookie: o servidor devolve credenciais inválidas antes de estabelecer uma nova sessão quando a conta não existe na base consultada ou a senha não confere. A resposta é deliberadamente igual para os dois casos.

O projeto usa SQLite. Em produção, o arquivo indicado por `DATABASE_URL` precisa ficar em um volume persistente. Um arquivo relativo em diretório efêmero pode desaparecer em reinícios ou deploys; instâncias com arquivos separados podem observar contas diferentes. Verifique se cadastro e login chegaram à mesma implantação e à mesma base persistente, sem redefinir a senha ou recriar contas para mascarar o problema.

A causa no deploy público não foi confirmada: a inspeção externa da implantação estava indisponível durante a análise. Os testes locais verificam cadastro, login e persistência na base usada pelo servidor, mas não comprovam a configuração do volume de produção.

## Regressão do servidor

`server/test/auth.test.ts` exercita os cookies emitidos no cadastro e no login em consultas paralelas e repetidas a sessão, coleções, histórico e métricas. Também verifica a política de cache, CORS com credenciais e preflight, sem substituir nem apagar o cookie nas leituras. Os testes usam um SQLite temporário criado por `npm test`.

Esses testes verificam o servidor. A aceitação de cookies, recarregamento e transição entre login e workspace também precisam ser exercitados no navegador na origem utilizada na implantação.

## Regressão do proxy

Execute `cd client && node --test test/api-proxy.test.js`. Os testes usam servidores HTTP locais e verificam caminhos/query, corpos POST brutos e já interpretados pela plataforma, cookies separados, origem preservada, rejeição sem origem/estrangeira no backend, host de destino fixo, redirecionamento sem seguimento, erros de configuração/conexão e o fallback da Vercel. Eles não publicam nem acessam contas de produção.
