# Interações e movimento

O vídeo enviado tem aproximadamente 18 segundos. A troca entre entrada e cadastro altera de uma vez a altura e a posição do formulário; o idioma substitui os textos diretamente. O foco dos campos tem pouca continuidade visual. As alterações mantêm a hierarquia compacta inspirada no Postman e acrescentam movimento às ações solicitadas.

| Interação | Comportamento implementado |
| --- | --- |
| Entrar / Criar conta | Indicador deslizante com mola suave; campos expandem/recolhem em 300 ms; posição do conjunto acompanha o conteúdo |
| Idioma | Textos e rótulos entram com fade/deslocamento curto, sem remontar os inputs ou apagar os valores; largura do seletor permanece estável |
| Claro / Escuro | Revelação radial de 500 ms a partir do botão; ícone acompanha a troca; navegadores sem View Transitions usam cores interpoladas em 220 ms |
| Menus de idioma e workspace | Entrada/saída de 200 ms com opacidade, escala discreta e deslocamento curto; campos e erros se expandem suavemente |
| Campos e botões | Foco com halo suave, feedback ao passar o mouse/pressionar, estados de envio e erro animados |

Os campos exclusivos do cadastro deixam de validar assim que começam a sair. Assim, pressionar Enter logo após voltar para entrada não é bloqueado por um campo invisível. As trocas rápidas de tema cancelam a transição anterior e preservam a última escolha.

Com `prefers-reduced-motion: reduce`, não há revelação radial nem deslocamento dos componentes. Os menus preservam Escape e retorno de foco; durante a saída ficam inertes. Não há animação de fundo contínua.

[Demonstração em vídeo](media/interaction-motion.mp4), 25 s, com dados fictícios e respostas de API simuladas. A gravação original do usuário não foi adicionada ao repositório. A demonstração apresenta o movimento visual; os testes de sessão usam validação separada.

## Validação

- `cd client && npm run build`: TypeScript e build de produção.
- `cd client && npm test`: 11 regressões do proxy com servidores HTTP locais.
- `cd client && npx playwright install chromium && npm run test:e2e`: regressões de sessão e animações com respostas de API controladas, sem alterar contas reais. O servidor de teste usa a porta 5183.
- Para usar Chromium já instalado: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.
- QA adicional no navegador: 8 verificações de formulário com movimento normal; 20 de menus e 9 de tema, incluindo fallback, movimento reduzido, cliques rápidos, foco e mobile; 15 verificações do fluxo completo contra a API local real, com limpeza da conta de teste.

As regressões de sessão cobrem cookie recusado no cadastro/login, confirmação lenta, cookie de outra conta, recarregamento, resposta 401 antiga e expiração da sessão atual. O backend verifica separadamente os cookies e a persistência entre processos. A configuração de produção está descrita em [SESSAO.md](SESSAO.md) e [PERSISTENCIA.md](PERSISTENCIA.md).
