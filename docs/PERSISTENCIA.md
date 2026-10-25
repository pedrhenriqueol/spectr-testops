# Contas que deixam de autenticar depois do cadastro

A resposta **E-mail ou senha inválidos** é a mesma para senha incorreta e conta ausente. Ela preserva a privacidade das contas e não prova, sozinha, que a senha foi alterada. A API usa SQLite: usuários, hashes de senha, sessões e coleções precisam continuar no mesmo arquivo após reinícios e novas publicações.

No código revisado, o cadastro e o login usam os mesmos parâmetros scrypt; registros do formato legado continuam aceitos. Os novos testes criam uma conta e coleção em um processo, encerram esse processo e abrem outro contra o mesmo SQLite. O segundo processo mantém a sessão anterior, aceita a senha original e lê a coleção. Não foi constatado um defeito de hash ou perda de dados nesse cenário.

Não foi possível inspecionar o armazenamento da API de produção nesta sessão. Portanto, perda de arquivo em armazenamento efêmero, mudança de `DATABASE_URL`, troca de instância ou destino de API diferente continuam sendo hipóteses a verificar, não uma causa confirmada do problema relatado.

## Implantação com disco persistente

O [render.yaml](../render.yaml) prepara uma API Node 22 com uma instância e disco persistente em `/var/data`. O arquivo SQLite fica em `file:/var/data/spectr.db`. O plano Starter permite anexar o disco; confirme os custos no provedor antes de aplicar o Blueprint. Este arquivo não foi aplicado a uma infraestrutura real.

O build gera o cliente Prisma e compila o servidor. Na inicialização, o arquivo é aberto em modo append, preservando um banco já existente; em seguida, `prisma db push` sincroniza o schema e inicia a API. Não há reset nem seed automático. A sincronização para caso encontre uma alteração que exija aceitar perda de dados: o comando não inclui `--accept-data-loss`.

Para uma API já existente, anexe o disco ao serviço atual e migre uma cópia consistente do banco antes de apontar `DATABASE_URL` para o novo caminho. Criar um serviço ou caminho vazio inicia outro banco e não recupera contas antigas. Use backup SQLite consistente, por exemplo a operação de backup da ferramenta SQLite; copie também o estado necessário de WAL se usar uma cópia de arquivos. Preserve o backup original e valide a contagem de usuários e workspaces após a migração.

No backend, `CLIENT_URL` deve corresponder à origem pública da interface. O Blueprint usa `https://spectr-testops.vercel.app`; ajuste se a origem mudar. Com o proxy na origem da interface, `SameSite=Lax; Secure` mantém os cookies protegidos sem depender de cookies de terceiros. Configure o destino HTTPS da API no proxy da Vercel conforme [SESSAO.md](SESSAO.md).

## Verificar uma instalação existente

1. Identifique o destino real da API usado pelo frontend e o caminho efetivo de `DATABASE_URL` nessa API. Um caminho relativo como `file:./dev.db` fica relativo ao schema Prisma e pode estar fora do disco montado.
2. Confira se o arquivo está no volume persistente e se a conta continua presente depois de reiniciar a API. Consulte apenas identificadores e contagens; não copie hashes, cookies ou senhas para logs.
3. Use uma instância com esse disco. Vários processos em máquinas diferentes com SQLite local possuem bancos diferentes; alternar entre eles pode alternar contas e sessões disponíveis.
4. Faça um cadastro de teste, logout, login e recarregamento. Reinicie a API e repita o login, verificando também se a coleção de teste permaneceu.

Se a conta original não estiver mais no banco, corrigir cookies ou trocar o algoritmo de senha não a restaura. A recuperação depende de um backup que contenha essa conta. Não crie ou altere senhas de contas reais durante o diagnóstico.

Os testes de regressão rodam com `cd server && npm test`, usando um banco temporário. Eles verificam persistência entre processos e compatibilidade dos hashes, mas não substituem a verificação do volume e da base de produção.
