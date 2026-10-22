# Evidências de validação

Data: 22/10/2026. Ambiente: Node.js 24.19.0, npm 11.9.0, SQLite local e Chromium. Os resultados abaixo correspondem à instância atual de desenvolvimento; não comprovam publicação ou restauração em uma nova tarefa na nuvem.

## Builds e testes do backend

- `server/npm run build`: passou.
- `server/npm run test:unit`: 2 testes passaram; são um subconjunto dos 16 testes da suíte completa.
- `server/npm test`: **16 testes passaram**, sem falhas, cancelamentos ou skips. O teste de corpo que não termina atingiu o timeout real de aproximadamente 15 segundos.
- `client/npm run build`: TypeScript e bundle Vite passaram após os ajustes finais.
- `git diff --check`: verificado também com os arquivos novos incluídos.

A suíte automatizada usa SQLite temporário em `/tmp` e servidor HTTP local. Cobre contratos aninhados/booleanos, percentis nearest rank, latência do corpo completo, SLA, timeout, override de ambiente, encadeamento de token, recursos ausentes, entradas inválidas, limites de histórico, filtros de workspace e rotas Chaos. O banco de desenvolvimento é preservado.

## Fluxo funcional do servidor

O roteiro reutilizável de instalação foi executado nesta máquina com `npm ci`, geração normal do Prisma, preparação não destrutiva do arquivo SQLite, aplicação do schema, seed e builds dos dois módulos. O seed foi repetido e manteve **2 coleções e 5 casos**, sendo 4 ativos, sem duplicações.

As duas coleções locais foram executadas pela API real: **4/4 casos passaram**. As execuções e suas asserções foram consultadas em `/runs/:id`; health, listagem de coleções e overview de métricas retornaram os dados esperados. Nenhuma chamada de aplicação foi feita contra o PayStream ou outro alvo externo.

Os engines Prisma foram conferidos com SHA256 oficial por HTTPS. Não foi desativada a verificação de TLS ou de integridade.

## Navegador

**21 verificações funcionais passaram no Chromium**, sem erros JavaScript não tratados na sequência principal. O roteiro de 19 cenários e os 2 cenários adicionais de indicadores foram executados pelo agente durante esta revisão; o projeto ainda não inclui uma suíte de navegador integrada ao CI.

1. Send consulta o backend real e renderiza o JSON da resposta.
2. Asserções individuais mostram status, SLA e contrato reais.
3. A troca de ambiente envia `baseUrl` no body ao servidor.
4. A execução de coleção exibe o resultado persistido.
5. Exportação JSON contém o identificador real da execução.
6. Exportação CSV contém as asserções reais.
7. Uma falha no POST de criação mantém campos preenchidos e mostra o erro.
8. Tab mantém o foco dentro do modal.
9. Escape fecha o diálogo e devolve o foco ao botão de origem.
10. Criação de coleção real seleciona o registro recém-criado.
11. Criação de endpoint real atualiza a coleção.
12. Send sem conexão exibe erro, sem resposta HTTP 200 artificial.
13. Chaos mede atraso pelo backend, sem percentis inventados.
14. Chaos sem conexão exibe falha, sem simulação fabricada.
15. Histórico mostra as execuções persistidas.
16. Troca de idioma atualiza a navegação.
17. Histórico vazio não cria registros de demonstração.
18. Falha de carregamento inicial mostra erro e ação de tentar novamente.
19. A sequência completa não gera exceções JavaScript; inclui a navegação para Chaos após execução, exportações, modais e falha de Send.
20. Contrato inválido mostra FAIL e `SCHEMA_INVALID`.
21. Caso sem contrato mostra SKIP, sem afirmar validação inexistente.

As falhas de transporte e o histórico vazio foram provocados por interceptação de rede no navegador para testar esses estados; os envios normais e os cenários de contrato usaram a API e o SQLite reais. Coleções temporárias criadas pelos roteiros foram removidas ao finalizar.

A inspeção responsiva em **360, 390, 768, 1024, 1280 e 1440 px** confirmou ausência de overflow horizontal da página e botão Send dentro da área visível. Os temas claro/escuro e a preferência de movimento reduzido foram exercitados. As coleções ficam recolhidas por padrão no celular.

## Capturas para revisão visual

Capturas geradas com resposta real do echo local, sem tokens ou credenciais:

- [Workbench desktop, tema escuro](images/workbench-desktop-dark.png)
- [Workbench desktop, tema claro](images/workbench-desktop-light.png)
- [Workbench mobile, tema claro](images/workbench-mobile-light.png)

## Pendências conhecidas

- Auditoria npm: **2 alertas altos no servidor** e **9 no cliente (6 altos, 3 moderados)** após correções compatíveis. As migrações principais estão descritas em [ANALISE_SISTEMA.md](ANALISE_SISTEMA.md).
- Autenticação/autorização multiusuário, política de destinos, cancelamento no servidor e JSON Schema completo ainda não foram implementados.
- Não foram feitos testes de carga, certificação WCAG ou comparação pixel a pixel com uma versão específica do Postman.
- O rascunho do ambiente recebeu `install_script`, `start_skill` e a adição de `binaries.prisma.sh` aos destinos permitidos. A publicação desse ambiente é uma ação do usuário nas configurações; não foi realizada pelo agente.
