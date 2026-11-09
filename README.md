# Marombinhas

Diário de calorias e macros com análise por IA. Cada pessoa acessa o próprio painel pelo nome no endereço (`seusite.vercel.app/felipe`), sem login e sem senha. Feito para rodar na **Vercel**.

## O que tem dentro

- **Dieta** (`/felipe`): metas, diário de refeições com IA, semana.
- **Treinos** (`/felipe/treino`, aba à esquerda de Metas): título e descrição da ficha (opcional), seções, exercícios com séries e peso, tudo editável com um toque. Exercícios vêm da base ou são digitados, e o botão "i" abre foto, ativação muscular, descrição e link de exemplo.
- **Base de exercícios** (`/exercicios`): global e escondida, sem nenhum link no painel (quem digita o endereço consegue editar). Só o nome é obrigatório.
- **Cardápio** (`/felipe/cardapio`, última aba): receitas da própria pessoa com foto, porção, macros e modo de preparo. Receitas anotadas no painel ficam só no painel dela.
- **Base de receitas** (`/receitas`): global e escondida, alimentada só por essa URL. Na aba Cardápio ela aparece somente leitura, com o botão "Adicionar ao meu cardápio" (cria uma cópia).
- **IA e receitas**: ao analisar uma refeição, a IA recebe as receitas da pessoa (e da base) e, quando o prato é o mesmo preparo, o servidor calcula os macros pela receita; se for diferente, estima como antes. Itens vindos de receita mostram "da receita: …".
- **Evolução** (`/felipe/evolucao`): gráfico do peso de cada exercício; o histórico é gravado ao mudar o peso.

## Como as peças se encaixam

```
public/            site (HTML, CSS, JS e logo): a Vercel serve estes arquivos
api/index.js       API: uma função serverless que atende tudo em /api/*
vercel.json        rotas (reescreve /api/* para a função) e cabeçalhos de segurança
dev/               só para testar no seu computador (não vai para produção)
```

- **Dados:** ficam em um banco Redis gratuito da Upstash (a Vercel não tem disco persistente).
- **IA:** a função `api/index.js` chama a API da Anthropic. A chave é lida de `process.env.ANTHROPIC_API_KEY` dentro do servidor e nunca chega ao navegador.

## Publicar na Vercel

Você não envia nenhum arquivo `.env`. As chaves são cadastradas no painel da Vercel.

1. **Suba o projeto para o GitHub.** O `.gitignore` já impede que `.env` seja enviado.
2. **Importe na Vercel.** Em vercel.com: *Add New… > Project*, escolha o repositório. Em *Framework Preset*, deixe **Other**. Não precisa de build command. Clique em *Deploy* (a primeira versão sobe sem IA e sem banco; é normal).
3. **Crie o banco.** No projeto, aba **Storage** (ou Marketplace) > **Upstash Redis** > crie um banco gratuito e conecte ao projeto. A integração adiciona sozinha as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` (ou `KV_REST_API_URL` e `KV_REST_API_TOKEN`; o código aceita os dois pares).
4. **Cadastre a chave da IA.** Crie a chave em console.anthropic.com > API Keys (precisa ter créditos na conta). Na Vercel: **Settings > Environment Variables** > nome `ANTHROPIC_API_KEY`, valor = a chave, ambientes Production e Preview. Marque como *Sensitive* se a opção aparecer.
5. **Faça um novo deploy.** Variáveis só valem para deploys criados depois delas: *Deployments > ⋯ no último > Redeploy*.
6. **Confira.** Abra `https://SEU-SITE.vercel.app/api/healthz`. O resultado deve ser `{"ok":true,"ai":true,"db":true}`. Se `ai` ou `db` vier `false`, falta a variável correspondente (ou falta o redeploy).

Pelo terminal, o equivalente ao passo 4 é `vercel env add ANTHROPIC_API_KEY`.

## Variáveis de ambiente

| Variável | Para que serve | Padrão |
|---|---|---|
| `ANTHROPIC_API_KEY` | Chave da IA (obrigatória para a análise) | |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Banco de dados (criadas pela integração) | |
| `ANTHROPIC_MODEL` | Modelo da análise. `claude-haiku-5-5` é mais barato | `claude-sonnet-5-5` |
| `DAILY_ANALYSES_PER_USER` | Análises por painel a cada 24 h | `40` |
| `DAILY_ANALYSES_GLOBAL` | Análises do site inteiro a cada 24 h (protege seu gasto) | `2000` |
| `ANALYSES_PER_IP_HOUR` | Análises por IP por hora | `60` |
| `CREATES_PER_IP_HOUR` | Painéis novos por IP por hora | `10` |

## Testar no seu computador

```bash
npm run dev            # http://localhost:3000
```

Sem banco configurado, usa um Redis falso em memória (os dados somem ao reiniciar). Para testar a IA, crie um arquivo `.env.local` (ele não vai para o Git) com `ANTHROPIC_API_KEY=sua-chave`.

## Notas

- **Acesso por nome:** `/felipe` abre o painel do Felipe. Se o nome ainda não existe, o site oferece criar. Não há senha: quem digitar o mesmo nome entra no mesmo painel. Para mais privacidade, use nomes menos óbvios (ex.: `felipe-x7k`). Os endereços antigos `/u/código` continuam funcionando.
- Nomes: 3 a 30 letras, números ou hífen (acentos e espaços são ajustados sozinhos). Alguns nomes são reservados (`api`, `admin`, `login`...).
- O site pede que buscadores não indexem os painéis e não envia o endereço como referência a outros sites.
- **Dados do Marombinhas antigo:** o treino usa as mesmas chaves do banco do projeto anterior (`treino:<nome>`, `base:global`, `foto:<id>`). Se você ligar a este projeto o mesmo banco Upstash do Marombinhas, os treinos, a base e as fotos já cadastrados aparecem sem migração. Para o treino abrir, o painel `/nome` precisa existir (o site oferece criar na primeira visita).
- **Domínio:** o endereço padrão vem do nome do projeto na Vercel. Para ser `marombinhas.vercel.app`, vá em Settings > Domains (ou renomeie o projeto), se o nome estiver livre.
- Fotos são reduzidas no navegador e **não são guardadas**; fica só uma miniatura de 96 px. A Vercel limita cada pedido a 4,5 MB, por isso o máximo é de 3 fotos por análise.
- O plano Hobby da Vercel é para uso não comercial.
- As estimativas da IA são aproximadas e não substituem nutricionista ou médico.


---

## Versão React (Vite)

O front-end foi portado para React 18 + Vite, com o mesmo visual (o `style.css` é o mesmo) e as mesmas funções. A API (`api/`), o banco e as variáveis de ambiente não mudaram.

### Comandos
- `npm install`
- `npm run dev:api` (API local na porta 3000, banco falso em memória se não houver Redis) e, em outro terminal, `npm run dev` (site em http://localhost:5173).
- `npm run build` gera `dist/`; `npm run preview` serve o site completo (dist + API) em http://localhost:3000.

### Vercel
O `vercel.json` já traz `framework: vite`, `buildCommand` e `outputDirectory: dist`. Basta subir tudo no GitHub; nada muda nas variáveis de ambiente.

### Estrutura de `src/`
- `main.jsx`, `App.jsx`: entrada e escolha da tela (`lib/routes.js`).
- `pages/`: `Landing`, `Panel` (painel com as 5 abas), `ClaimScreen`.
- `features/diario/`: `Hoje`, `Semana`, `Metas`, `MealSheet` (registrar/editar refeição).
- `features/treino/`: `TreinoTab`, `Editable`, `ExerciseBasePage` (/exercicios), `ProgressPage` (/nome/evolucao), `WeightChart`.
- `features/cardapio/`: `CardapioTab`, `RecipePanel`, `RecipeBasePage` (/receitas).
- `hooks/`: `useTreino` (gravação automática), `useCollection` (listas da API).
- `components/`, `lib/`: peças compartilhadas, cliente da API, fotos e regras sem React.
