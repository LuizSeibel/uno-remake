# UNO Remake — Cliente

Interface construída com **Phaser 3**, **Vite** e **TypeScript** para o protótipo multiplayer estilo UNO.

## Pré-requisitos

- Node.js 20+ (recomendado)  
- npm 10+
- Servidor Socket.IO rodando em `http://localhost:3001` (veja `../server`)

## Instalação

```bash
cd client
npm install
```

## Scripts úteis

| Script           | Descrição                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| `npm run dev`    | Inicia Vite em modo desenvolvimento (porta 5173 por padrão).              |
| `npm run build`  | Executa `tsc` e gera o bundle de produção com o Vite.                     |
| `npm run preview`| Serve o build gerado para validação rápida.                               |

> Durante o desenvolvimento, abra `http://localhost:5173` e confirme que o backend está ativo para que o `socket.io-client` consiga conectar.

## Estrutura resumida

- `src/main.ts` – boot do Phaser com as cenas e configuração de escala.  
- `src/scenes/TitleScene.ts` – lobby em canvas para criar/entrar em salas.  
- `src/scenes/GameScene.ts` – HUD do jogo, comunicação via Socket.IO e placeholders.  
- `src/types.ts` – contratos compartilhados com o backend.

## Personalização

- Para apontar para outro backend, ajuste a URL usada pelo `io()` em `src/scenes/GameScene.ts`.
- As fontes e cores principais estão concentradas nos arquivos de cena para facilitar o refino visual.
