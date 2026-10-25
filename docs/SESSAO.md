# Sessão persistente e retorno ao login

Quando cadastro/login retorna sucesso, mas as primeiras consultas do workspace recebem `401`, a interface não pode considerar a sessão estabelecida apenas pelo corpo da resposta de autenticação. O navegador também precisa aceitar e reenviar o cookie `spectr_session`. A confirmação ocorre por uma consulta autenticada a `GET /api/v1/auth/me` antes de abrir o workspace.

O cadastro pode ter sido concluído mesmo quando o navegador recusa o cookie. Nesse caso, a conta existe: corrija a configuração da sessão e use **Entrar**. Repetir o cadastro com o mesmo e-mail retorna conflito.

## Identificar a origem

No painel Network do navegador, observe os status de `auth/register` ou `auth/login`, `auth/me` e das consultas iniciais de coleções/histórico. Na aba de cookies da resposta, o navegador informa se bloqueou o cookie e o motivo. Não copie valores de cookies, senhas ou cabeçalhos de autenticação para relatórios.

| Evidência | Verificação |
| --- | --- |
| `/api/v1/auth/me` ou login com `404` e mensagem `The page could not be found` da Vercel | O encaminhamento da API não está ativo nessa publicação; não é uma resposta de senha inválida do backend |
| Login/cadastro bem-sucedido, seguido de `auth/me` com `401` | Cookie recusado, não enviado, expirado ou sessão indisponível na instância consultada |
| Navegador aponta `SameSite=Lax` em chamada entre sites diferentes | Publique a API no mesmo site; se precisar de sites distintos, configure `SameSite=None; Secure` e HTTPS |
| Cookie marcado como terceiro e bloqueado | `SameSite=None` sozinho não resolve: use API no mesmo site ou proxy na origem da interface |
| Erro de CORS/conexão | `CLIENT_URL` precisa ser a origem exata da interface; confira o destino dos rewrites e, quando usar transporte direto, `VITE_API_URL` |
| `403` ao alterar dados | Confira a origem permitida e a associação do usuário ao workspace; esse status não indica expiração da sessão |
| Sessão funciona em algumas requisições e falha em outras | Todas as instâncias precisam consultar a mesma base persistente de usuários/sessões |

As respostas de sessão e dados privados usam `Cache-Control: no-store`. O proxy/CDN deve preservar esse cabeçalho e não armazenar respostas autenticadas.

## Proxy pela mesma origem na Vercel

O cliente usa `/api/v1` na mesma origem por padrão. A regra de publicação encaminha esse caminho diretamente para o backend informado do projeto:

```json
{
  "source": "/api/v1/:path*",
  "destination": "https://spectr-testops-server.onrender.com/api/v1/:path*"
}
```

Essa regra vem antes do fallback da SPA. O fallback exclui `/api`, preservando respostas de erro da API em vez de devolver o HTML da interface. Não há função Node intermediária ou variável de execução obrigatória. `SPECTR_API_URL` continua sendo apenas uma opção do proxy local do Vite; não altera o destino publicado dos rewrites.

O repositório inclui configurações equivalentes para **Root Directory** vazio/raiz (`vercel.json`, saída `client/dist`) e **Root Directory = client** (`client/vercel.json`, saída `dist`). Cada arquivo declara os comandos apropriados de instalação e build. Isso cobre as duas formas de publicar o monorepo sem depender da descoberta de arquivos em `api/`.

No backend, preserve a origem pública exata da interface e a base persistente:

```ini
NODE_ENV=production
CLIENT_URL=https://spectr-testops.vercel.app
SESSION_SAME_SITE=lax
SESSION_SECURE=true
# DATABASE_URL deve apontar para o SQLite em armazenamento persistente do servidor
```

Depois de aplicar as alterações na `main`, confirme que a Vercel publicou esse commit no domínio de produção. O deploy anterior continua com suas regras antigas. Ao mudar o backend, atualize o destino em ambos os arquivos; `npm test` verifica a correspondência e compila as regras com `@vercel/routing-utils`.

O backend emite o cookie sem `Domain`, com `Path=/api/v1`, HttpOnly e Secure em produção. Por meio do rewrite, o navegador recebe o cookie na origem da interface e o envia nas chamadas seguintes ao mesmo caminho. A configuração não fixa um `Origin` confiável nas chamadas: a validação CSRF do backend continua exigindo a origem permitida. Não é necessário gravar tokens em `localStorage` nem habilitar cookies de terceiros.

Coleções são executadas de forma síncrona e precisam respeitar os limites de tempo do proxy da plataforma. Essa configuração não usa o limite da função Node removida.

## Confirmar o deploy público

Execute `cd client && npm run check:deployment`. A verificação faz apenas consultas públicas, sem autenticar ou criar contas:

| Endereço | Resposta esperada |
| --- | --- |
| `https://spectr-testops-server.onrender.com/health` | `200` JSON do motor Spectr |
| `https://spectr-testops-server.onrender.com/api/v1/auth/me` | `401` JSON sem sessão |
| `https://spectr-testops.vercel.app/api/v1/auth/me` | O mesmo `401` JSON, encaminhado ao Render |

O `401` sem login é normal e abre o formulário sem erro de conexão. Um `404` da Vercel indica que o domínio ainda não usa o deploy com a regra de API; um `404` JSON do Fastify exige conferir a versão/rota publicada no Render. Um erro de rede antes de alcançar os sites não permite validar a implantação.

Para uma instalação que precisa falar diretamente com uma API em outro site, use explicitamente `VITE_API_TRANSPORT=direct` com `VITE_API_URL` absoluta. Consulte `SESSION_SAME_SITE`, `SESSION_SECURE` e `CLIENT_URL` no [README](../README.md#cookies-origem-e-publicação). Essa opção depende também da política de cookies do navegador.

## Conta criada passa a retornar credenciais inválidas

Esse sintoma precisa ser investigado separadamente da aceitação do cookie: o servidor devolve credenciais inválidas antes de estabelecer uma nova sessão quando a conta não existe na base consultada ou a senha não confere. A resposta é deliberadamente igual para os dois casos.

O projeto usa SQLite. Em produção, o arquivo indicado por `DATABASE_URL` precisa ficar em um volume persistente. Um arquivo relativo em diretório efêmero pode desaparecer em reinícios ou deploys; instâncias com arquivos separados podem observar contas diferentes. Verifique se cadastro e login chegaram à mesma implantação e à mesma base persistente, sem redefinir a senha ou recriar contas para mascarar o problema.

A causa no deploy público não foi confirmada: a inspeção externa da implantação estava indisponível durante a análise. Os testes locais verificam cadastro, login e persistência na base usada pelo servidor, mas não comprovam a configuração do volume de produção.

## Regressão do servidor

`server/test/auth.test.ts` exercita os cookies emitidos no cadastro e no login em consultas paralelas e repetidas a sessão, coleções, histórico e métricas. Também verifica a política de cache, CORS com credenciais e preflight, sem substituir nem apagar o cookie nas leituras. Os testes usam um SQLite temporário criado por `npm test`.

Esses testes verificam o servidor. A aceitação de cookies, recarregamento e transição entre login e workspace também precisam ser exercitados no navegador na origem utilizada na implantação.

## Regressão do roteamento

Execute `cd client && npm test`. As configurações de raiz e cliente são compiladas pelo parser oficial de rotas da Vercel. Os testes verificam os caminhos reais de autenticação, coleções, execuções e workspaces, o destino fixo no Render e a separação das rotas API do fallback da aplicação. A compilação local não comprova que o domínio público já recebeu o novo deploy; use também a verificação pública acima. As regressões de navegador (`npm run test:e2e`) cobrem cadastro/login, confirmação da sessão e expiração com respostas controladas.
