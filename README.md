# RJvidros OS v1.0

Aplicacao web MVC para gestao de ordens de serviço de vidracaria. O sistema replica a base do Molatec OS e foi adaptado para RJvidros, com pagina publica responsiva, formulario de solicitação, painel administrativo, clientes, técnicos, ordens, solicitacoes, financeiro e relatórios.

## Stack

- Node.js 22
- Express
- SQLite
- JavaScript em POO no backend e frontend
- HTML/CSS responsivo para uso em celulares

## Funcionalidades

- Home publica com galeria de vidracaria
- Formulário público com validação, honeypot e rate limit
- Login administrativo com token assinado e senha com hash PBKDF2
- Cadastro de clientes e técnicos
- Criacao e acompanhamento de ordens de serviço
- Conversão de solicitações em OS
- Controle financeiro e relatórios
- Envio opcional de comprovante/NFe por SMTP
- Headers de seguranca, CORS configuravel e segredo obrigatório em producao

## Rodar localmente

```bash
npm install
npm start
```

Acesse:

```text
http://localhost:3000
```

## Variaveis de ambiente

Copie `.env.example` como referência e configure no Render:

```text
NODE_ENV=production
HOST=0.0.0.0
DB_PATH=/var/data/rjvidros.db
ADMIN_EMAIL=admin@rjvidros.com.br
ADMIN_PASSWORD=troque-esta-senha
ADMIN_NAME=Administrador
AUTH_TOKEN_SECRET=troque-por-uma-chave-grande-e-aleatoria
WHATSAPP_CENTRAL_NUMBER=55DDDNUMERO
WHATSAPP_CENTRAL_NAME=Central RJvidros
```

## Deploy

O arquivo `render.yaml` ja cria um Web Service com disco persistente em `/var/data`. No GitHub, envie este repositorio e conecte no Render usando Blueprint ou Web Service Node.

Comandos:

```bash
npm install --build-from-source=sqlite3
npm start
```

## Imagens

As imagens da home estão em `frontend/assets/home`. Quando as fotos reais do cliente estiverem disponíveis, substitua mantendo os nomes:

- `hero-mola-manutencao.png`
- `mola-piso-vidro.png`
- `mola-piso-close.png`
- `tecnico-regulagem-mola.png`

A logo vetorial está em `frontend/assets/logo-rjvidros.svg`.

## Primeiro acesso

Quando o banco estiver vazio, o sistema cria o primeiro administrador usando `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME`.

Para trocar o admin depois:

```bash
npm run set-admin
```
