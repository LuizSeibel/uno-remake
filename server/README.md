# UNO Remake — Servidor

Backend em **Node.js + Express + Socket.IO** escrito em **TypeScript**. Ele é responsável por criar/gerenciar salas, broadcast de ações de cartas e sincronização básica com o cliente Phaser.

## Pré-requisitos

- Node.js 20+ (recomendado)  
- npm 10+

## Instalação

```bash
cd server
npm install
```

## Executando em desenvolvimento

Como o projeto usa `ts-node`, basta rodar:

```bash
npx ts-node src/server.ts
```

O servidor escuta em `http://localhost:3001` e expõe:

- Socket.IO com eventos `room:create`, `room:join`, `room:leave`, `card:play` e `card:draw`.  
- Endpoint REST `GET /health` para health-check simples.

> Ajuste a origem permitida no construtor do `Server` em `src/server.ts` caso o front seja servido em outra URL.

## Estrutura resumida

- `src/server.ts` – inicialização do Express/Socket.IO e toda a lógica de sala e eventos.  
- `src/types.ts` – contratos compartilhados com o client (cartas, salas, payloads).

## Próximos passos sugeridos

- Adicionar scripts `npm run dev` / `npm run build` com `ts-node-dev` ou `tsc`.  
- Persistência real de sala/jogo e validações de regras UNO personalizadas.  
- Configuração via variáveis de ambiente (porta, origem, etc.).
