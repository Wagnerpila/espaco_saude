# Deploy em produção (VPS Hostinger com EasyPanel)

A VPS (`72.60.58.67`) já roda [EasyPanel](https://easypanel.io), gerenciando
Docker e um proxy reverso (Traefik) nas portas 80/443 para os outros projetos
já hospedados ali (`evolution`, `n8n`, `homeassistant`). Por isso o deploy do
`espaco-saude` usa o próprio EasyPanel para roteamento e HTTPS — **não** um
Nginx/Certbot próprio (isso entraria em conflito de porta com o Traefik que
já está rodando).

A imagem Docker (`Dockerfile` na raiz) empacota frontend + backend num único
container — mais simples de mapear pro modelo do EasyPanel (1 serviço = 1
domínio = 1 certificado). Já testado localmente: build e execução funcionam
(API em `/api/*`, frontend estático servido pelo mesmo processo Express,
fallback de SPA para rotas como `/Dashboard`).

## Domínio

`espacosaude.wcmdigital.com.br` → já aponta pra `72.60.58.67` (registro A
confirmado via `nslookup`).

## 1. Levar o código pra VPS (rsync, sem git por enquanto)

Rodar na máquina local, na raiz do projeto:

```bash
rsync -avz --exclude node_modules --exclude .git --exclude dist --exclude '.env' \
  ./ root@72.60.58.67:/opt/espaco-saude/
```

## 2. Buildar e publicar a imagem

O EasyPanel pode rodar uma imagem Docker pronta (source "Docker Image"), mas
precisa conseguir *puxar* essa imagem de algum lugar — não dá pra apontar
direto pra uma imagem que só existe no cache local do `docker build`. Caminho
mais simples sem precisar configurar git: publicar num registro Docker Hub
gratuito.

```bash
ssh root@72.60.58.67
cd /opt/espaco-saude

docker build -t SEU_USUARIO_DOCKERHUB/espacosaude:latest .

docker login          # login único, conta grátis em hub.docker.com
docker push SEU_USUARIO_DOCKERHUB/espacosaude:latest
```

(Se ainda não tiver conta no Docker Hub, criar uma grátis em
https://hub.docker.com — o plano free permite pelo menos 1 repositório
privado, ou pode deixar público já que a imagem não tem nenhum segredo
embutido, só código.)

## 3. Criar o banco no EasyPanel

No painel EasyPanel:

1. **Projetos → Novo** → nome `espaco-saude`.
2. Dentro do projeto, **+ Novo serviço → Postgres** (mesmo padrão usado pelo
   `evolution-api-db`).
3. Definir uma senha forte para o Postgres.
4. Depois de criado, abrir o serviço Postgres e copiar a **string de conexão
   interna** (geralmente numa aba tipo "Conexão"/"Credentials" do próprio
   serviço) — vai ser usada como `DATABASE_URL` no próximo passo.

## 4. Criar o app no EasyPanel

Ainda dentro do projeto `espaco-saude`:

1. **+ Novo serviço → App**.
2. **Fonte (Source):** Docker Image → `SEU_USUARIO_DOCKERHUB/espacosaude:latest`.
3. **Variáveis de ambiente** — colar o conteúdo de `server/.env.example`
   preenchido com valores reais de produção, mais:
   - `DATABASE_URL` → a string de conexão do passo 3 (⚠️ **não** usar a
     `DATABASE_URL` que o `docker-compose.yml` de dev injeta automaticamente
     — aqui precisa ser setada manualmente com o host do Postgres do EasyPanel).
   - `CORS_ORIGIN="https://espacosaude.wcmdigital.com.br"`
   - `PUBLIC_UPLOADS_URL="https://espacosaude.wcmdigital.com.br/uploads"`
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → gerar novos e fortes,
     não reaproveitar os de dev.
   - `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` /
     `EVOLUTION_WEBHOOK_SECRET` → os mesmos já usados e testados na Fase 5.
   - `ANTHROPIC_API_KEY` → deixar vazio por enquanto (Fase 6 pausada).
   - `PORT=3001`
4. **Porta do container:** `3001`.
5. **Domínio:** adicionar `espacosaude.wcmdigital.com.br` na aba de domínios
   do serviço — o EasyPanel provisiona o certificado Let's Encrypt sozinho
   via Traefik.
6. **Volume/Mount persistente:** mapear `/app/uploads` pra um volume, senão os
   arquivos enviados (fotos de perfil, anexos de prontuário) somem a cada
   redeploy.
7. Deploy.

## 5. Verificar

```bash
curl -I https://espacosaude.wcmdigital.com.br/api/health
```

Deve responder `{"ok":true}`. Acessar `https://espacosaude.wcmdigital.com.br`
no navegador e logar. Criar o primeiro admin, se ainda não existir nenhum,
via um shell dentro do container do app (EasyPanel geralmente tem um botão
"Console"/"Terminal" no próprio serviço):

```bash
node scripts/create-admin.js
```

## 6. Repontar o webhook da Evolution API

Com o domínio já respondendo em HTTPS, repontar o webhook da instância (hoje
apontando pro n8n — ver decisão registrada na migração) para:

```
https://espacosaude.wcmdigital.com.br/api/webhooks/evolution
```

## Deploys seguintes (atualizar código)

```bash
# local
rsync -avz --exclude node_modules --exclude .git --exclude dist --exclude '.env' \
  ./ root@72.60.58.67:/opt/espaco-saude/

# na VPS
ssh root@72.60.58.67
cd /opt/espaco-saude
docker build -t SEU_USUARIO_DOCKERHUB/espacosaude:latest .
docker push SEU_USUARIO_DOCKERHUB/espacosaude:latest
```

Depois, no EasyPanel: abrir o serviço do app e clicar em "Deploy"/"Redeploy"
pra ele puxar a imagem nova. Migrações do Prisma rodam automaticamente no
start do container (`npx prisma migrate deploy` no `CMD` do `Dockerfile`).
