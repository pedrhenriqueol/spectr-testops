# Evidências de validação

Revisão: 24/10/2026. Node.js 24, npm 11, Prisma/SQLite e Chromium. Estas verificações pertencem à instância local de desenvolvimento; não afirmam publicação, migração de uma instalação de produção ou restauração de uma nova tarefa na nuvem.

## Build e regressão automatizada

- Backend: `npm run build` passou.
- Backend: `npm test` passou com **48/48 testes**, sem falhas, skips ou cancelamentos, em aproximadamente 26 segundos.
- Frontend: `npm run build` passou, incluindo TypeScript e bundle Vite.
- Arquivos novos e modificados incluídos na verificação de `git diff --check`.

A suíte usa um SQLite temporário exclusivo. Ela cobre autenticação, hash de senha, cookies, expiração/revogação de sessão, origem de requisições, rate limit de login, isolamento por workspace, CRUD de casos, execução de rascunhos sem persistir, SLA, contratos, ordenação, encadeamento de token, percentis e timeout real de 15 segundos.

A política de saída foi exercitada com IPs privados/reservados, resolução DNS, variantes numéricas de loopback, redirects, headers sensíveis, limite de resposta descomprimida de 2 MiB, cancelamento de corpo e DNS e um redirect com corpo aberto que anteriormente podia derrubar o processo. O echo público não devolve cookies ou headers de credenciais.

## Navegador com backend real

Os roteiros foram executados com a interface e API reais e criaram somente contas, workspaces e coleções temporárias próprias. As fixtures foram removidas por identificador ao terminar; dados anteriores permaneceram preservados. Não foram enviadas requisições de aplicação ao PayStream ou a outros serviços externos.

| Roteiro | Resultado | Comportamentos verificados |
|---|---|---|
| Autenticação | **15/15** | Login inválido, cadastro inválido/válido, cookie HttpOnly, ausência de tokens em localStorage, recarregamento, logout, sessão revogada, criação/troca de workspace e veto ao descarte de rascunho |
| Isolamento e workbench | **13/13** | Duas contas em contextos independentes, negação de leitura/escrita/execução entre contas, seleção de workspace, envio real, abas, divisor e navegação |
| Editor integrado | **7/7** | Método/URL/headers/body editáveis, envio de draft sem gravar, falha de Save preservando campos, Ctrl+S persistente após reload, JSON inválido bloqueado, Discard, schema booleano inválido, coleção salva/exportação real e exclusão confirmada |

Os números de cada roteiro são apresentados separadamente; alguns cenários se sobrepõem. Falhas de conexão/POST foram provocadas com interceptação de rede para verificar mensagens e preservação de dados. As execuções normais, asserções, persistência e isolamento usaram SQLite e HTTP reais.

Também foram exercitados previamente os componentes isolados do editor e do painel de resposta. Esses checks não substituem as verificações integradas acima. A CI adicionada executa build/testes do backend e build/typecheck do frontend; ela ainda não inclui os roteiros de navegador.

## Revisão visual concluída

O workbench foi verificado em **1440×900, 1280×768, 1024×768, 768×900, 390×844 e 360×740**, nos temas claro e escuro: **12 estados responsivos**. Login e seletor de workspace tiveram uma matriz adicional de 16 estados.

- Header global com 44 px.
- Send, Run e navegação dentro da viewport; sem overflow horizontal da página.
- IDs de controles sem duplicação ao abrir a árvore no celular.
- Abas com clique, ArrowLeft/Right e Home/End; divisor com mouse e teclado.
- Resposta com aproximadamente 56,5% da área dos painéis no estado padrão: 457 px em 1440×900, 382 px em 1280×768, 402 px em 390×844 e 343 px em 360×740.
- Nenhuma exceção JavaScript não tratada nos roteiros aprovados.

Capturas com dados locais de teste, sem tokens, cookies ou senhas:

- [Desktop escuro](images/postman-redesign-desktop-dark.png)
- [Desktop claro](images/postman-redesign-desktop-light.png)
- [Celular claro](images/postman-redesign-mobile-light.png)

A justificativa e a organização dos componentes estão em [REDESIGN_POSTMAN.md](REDESIGN_POSTMAN.md).

## Ambiente, produção e limites

O schema Prisma foi atualizado de forma aditiva para usuários, sessões e associações a workspaces, sem apagar dados existentes. Contas novas não recebem posse automática dos workspaces legados. O primeiro acesso exige criar uma conta; não há senha de administrador pré-configurada.

As instruções reutilizáveis de instalação/inicialização foram atualizadas no rascunho do ambiente. A publicação desse ambiente é uma ação do usuário nas configurações, separada do push do código.

Produção requer HTTPS, armazenamento persistente do SQLite, `CLIENT_URL` exata e `VITE_API_URL` correta. Em sites distintos, cookies exigem `SESSION_SAME_SITE=none` e `SESSION_SECURE=true`, além de suporte do navegador a cookies de terceiros; uma implantação no mesmo site evita essa dependência. O proxy de saída pode exigir `TARGET_ALLOWED_HOSTS` e liberação dos destinos na rede da instalação.

Continuam fora desta entrega convites de membros, recuperação de senha, JSON Schema/OpenAPI completo, importação de coleções Postman, filas e cancelamento no servidor. A auditoria anterior apontou dependências principais que exigem migração; não foram aplicadas atualizações forçadas de frameworks. Não foram feitos testes de carga, certificação WCAG nem validação de uma implantação remota de produção.
