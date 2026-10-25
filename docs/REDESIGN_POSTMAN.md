# Redesign do workbench a partir das referências do Postman

Revisão: 24/10/2026. Esta revisão reorganiza a interface entregue no commit `7d4692f`, usando as duas capturas do Postman fornecidas na conversa como referência visual.

## O problema de composição

A versão anterior concentrava navegação, ambiente, demonstração, execução, configurações e resultados em barras com destaque semelhante. A sequência URL → ambiente/SLA → aviso de URL → abas → cartões de configuração → modos de resposta → métricas/exportação criava a sensação de elementos empilhados.

A sidebar também apresentava coleções em seletores horizontais e repetia o nome selecionado antes da árvore. A combinação de badges, bordas, laranja e texto monoespaçado por toda a interface dificultava distinguir navegação, configuração e resultados.

Nas referências do Postman, a barra global é discreta, a navegação ocupa uma faixa lateral estreita, as coleções formam uma árvore e o editor possui um eixo principal claro: método, URL e Send. O resultado ocupa uma superfície própria, separada por um divisor.

## Implementação

| Componente | Organização aplicada |
|---|---|
| Barra global | Altura fixa de 44 px, marca compacta, workspace, busca, idioma e tema; sem execução/ambiente misturados à navegação |
| Navegação | Rail de 64 px no desktop com Coleções, Chaos e Histórico; faixa horizontal de 40 px no celular |
| Coleções | Uma única árvore vertical de pastas e requisições; busca, criação e menu de ações discretos; removidos pills horizontais e SLA por linha |
| Contexto da requisição | Aba com método/nome da requisição; ambiente, configuração da Base URL e ação Run na mesma faixa de contexto |
| Editor HTTP | Método integrado à URL e Send como ação principal; método e caminho/URL são editáveis; o destino resolvido fica disponível no contexto |
| Configuração | Abas Parâmetros, Headers, Body, Testes e SLA e Contrato; tabelas editáveis, JSON com validação e Save/Discard discretos |
| Base URL / URL absoluta | Configuração em popover; aviso de endereço absoluto fica no contexto da URL e nas configurações, sem faixa permanente |
| Divisão dos painéis | Divisor ajustável por arraste, toque e teclado; editor começa em 43% e resposta usa o espaço restante |
| Resposta | Header compacto com modos e métricas; subtabs e exportação aparecem quando existe resultado; payload em canvas simples |
| Estado vazio | Área central com ícone discreto e orientação curta; sem métricas nem histórico de outra execução |
| Resultados | Status e cores refletem o resultado; a execução de outra coleção não aparece no contexto selecionado |
| Movimento | Feedback de cor e entrada curta; navegação não espera a saída de animações internas; movimento reduzido continua respeitado |

A paleta permanece neutra, com laranja para a ação principal e indicadores finos de seleção. Tipografia de interface é usada para navegação e nomes; monoespaçada para método, URL, código e métricas. O grid usa passos de 4/8/12/16 px.

As abas suportam setas, Home/End e foco móvel entre opções. O divisor pode ser ajustado com setas para cima/baixo e Home/End. No celular, o botão de pasta abre a árvore sobre o editor, sem reduzir sua altura.

## Estrutura do código

O antigo componente `Workstation` concentrava a renderização dos três painéis. Agora ele coordena seleção, execução, exportação e proporção; os componentes visuais são independentes:

- `WorkspaceRail`: navegação entre módulos.
- `CollectionsSidebar`: árvore e ações das coleções.
- `RequestPanel`: URL e configuração da requisição.
- `ResponsePanel`: resposta, testes, console e exportação.
- `JsonCodeView`: apresentação compartilhada de JSON.
- `AuthScreen` e `WorkspaceSwitcher`: acesso à conta e troca de contexto autenticado.

A revisão inclui edição persistente de requisições e envio de rascunhos sem gravar. Nome, método, URL, parâmetros, headers, body, limites e contrato são editáveis. Erros preservam o rascunho; exclusão pede confirmação. Login, cadastro e seleção de workspace foram integrados ao mesmo desenho. Workspaces e dados anteriores são preservados; novos usuários recebem seus próprios espaços isolados.

## Revisão visual

As capturas usam apenas coleções locais e respostas reais do motor de testes:

- [Desktop escuro — novo layout](images/postman-redesign-desktop-dark.png)
- [Desktop claro — novo layout](images/postman-redesign-desktop-light.png)
- [Celular — novo layout](images/postman-redesign-mobile-light.png)
- [Desktop anterior, para comparação](images/workbench-desktop-dark.png)

As evidências de execução e as medidas da revisão são registradas ao final deste documento.

## Validação da revisão

O redesign foi concluído junto ao login e ao editor funcional. Foram aprovados os dois temas em seis viewports (12 estados), incluindo uma resposta de 402 px em 390×844 no estado padrão. A barra global permanece em 44 px; Send, Run e navegação não ultrapassam a largura disponível. Roteiros de navegador cobriram autenticação, duas contas isoladas, edição persistente, execução de rascunhos, exportação, exclusão confirmada e teclado, sem exceções JavaScript não tratadas. Consulte [VALIDACAO.md](VALIDACAO.md) para os resultados e limites precisos.
