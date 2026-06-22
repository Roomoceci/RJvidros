# Deploy no Render

Este projeto esta pronto para publicar como aplicacao web Node.js no Render, usando SQLite com disco persistente.

## 1. Enviar para o GitHub

```bash
git init
git add .
git commit -m "Initial RJvidros OS deploy"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/rjvidros.git
git push -u origin main
```

## 2. Criar no Render

Opcao recomendada: usar o `render.yaml` como Blueprint.

Tambem e possivel criar manualmente:

- Runtime: Node
- Build command: `npm install --build-from-source=sqlite3`
- Start command: `npm start`
- Health check path: `/health`
- Disk mount path: `/var/data`

## 3. Variaveis obrigatorias

Configure no painel do Render:

```text
NODE_ENV=production
HOST=0.0.0.0
DB_PATH=/var/data/rjvidros.db
ADMIN_EMAIL=admin@rjvidros.com.br
ADMIN_PASSWORD=uma-senha-forte
ADMIN_NAME=Administrador
AUTH_TOKEN_SECRET=uma-chave-grande-e-aleatoria
WHATSAPP_CENTRAL_NUMBER=55DDDNUMERO
WHATSAPP_CENTRAL_NAME=Central RJvidros
```

`AUTH_TOKEN_SECRET` é obrigatório em produção para proteger as sessões.

## 4. Depois do deploy

1. Abra `/health` e confirme `status: ok`.
2. Acesse `/login.html`.
3. Entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
4. Cadastre técnicos e comece a receber solicitações pelo formulário público.

## 5. Atualizar admin

No shell do Render, ou localmente com as variaveis configuradas:

```bash
npm run set-admin
```

## 6. Resetar banco

Use apenas quando tiver certeza:

```bash
CONFIRM_RESET_DB=true npm run reset-db
```
