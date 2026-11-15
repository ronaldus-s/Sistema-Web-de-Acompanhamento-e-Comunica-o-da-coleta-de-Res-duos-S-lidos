# Sistema Web de Acompanhamento e Comunicação da Coleta de Resíduos Sólidos em Quixadá

Aplicação web que facilita o acesso da população de Quixadá às informações sobre a coleta de resíduos sólidos, permitindo consultar os horários por bairro, visualizar a localização atualizada do caminhão de coleta e receber avisos sobre atrasos, interrupções ou alterações nas rotas.

Projeto acadêmico da UFC Quixadá, com caráter de extensão universitária.

> **Nota:** esta é a versão com **Firebase** (Authentication, Firestore e Hosting). A versão com Strapi é mantida separadamente.

## Sobre o projeto

O cidadão frequentemente tem dificuldade para saber se o veículo de coleta já passou por sua região, quando a coleta está sendo realizada ou se ocorreu alguma alteração no serviço. Um calendário fixo não é suficiente para representar situações como atrasos, interrupções ou mudanças de rota.

Esta aplicação oferece uma alternativa dinâmica: moradores acompanham a coleta e a posição do caminhão em tempo real, enquanto os coletores atualizam as operações por uma área restrita.

## Público-alvo

- **Moradores de Quixadá**: consultam informações sobre a coleta em suas regiões
- **Coletores**: iniciam a coleta e transmitem a posição do caminhão
- **Administradores**: gerenciam regiões, avisos e coletas

## Funcionalidades

### Área pública (sem login)
- Cronograma de coleta por bairro (dias e horários), com busca

### Área do morador (com login)
- Mapa com a posição do caminhão em tempo real
- Distância em linha reta até o caminhão, usando a localização do celular
- Situação da coleta: normal, atrasada ou interrompida
- Avisos publicados pela equipe

### Área do coletor (com login)
- Iniciar e encerrar a coleta, escolhendo a rota
- Informar atraso, interrupção ou volta ao normal
- Transmitir a localização periodicamente
- Retomar a transmissão automaticamente se a página for recarregada

### Área administrativa (com login)
- Regiões: cadastrar, alterar horário e remover
- Avisos: criar, listar e remover
- Coletas: acompanhar, forçar o encerramento, apagar registros e agir em lote ("Encerrar todas abertas" e "Apagar todas")

## Papéis de usuário

| Papel | Permissões |
|---|---|
| **Morador** (`usuario`) | Vê cronograma, mapa e avisos |
| **Coletor** (`coletor`) | Inicia, atualiza e encerra a própria coleta |
| **Administrador** (`admin`) | Gerencia regiões, avisos e coletas |

Todo cadastro novo entra como **morador**. Quem pede para ser coletor fica com a solicitação registrada, e a promoção a coletor ou administrador é feita manualmente no console do Firebase (veja "Criar o primeiro administrador").

## Dados (Cloud Firestore)

| Coleção | Conteúdo |
|---|---|
| `usuarios` | Perfil de cada conta: nome, e-mail, perfil e perfil solicitado |
| `regioes` | Bairros atendidos, com dias e horário da coleta |
| `avisos` | Comunicados publicados pela equipe |
| `coletas` | Coletas em andamento ou encerradas: rota, situação, posição e coletor |

A modelagem original em `docs/` descreve a versão inicial do projeto. Nesta versão, os dados ficam no Firestore, conforme a tabela acima.

## Segurança

O acesso é controlado pelas regras do Firestore (`firestore.rules`):

- O cronograma (`regioes`) pode ser lido sem login.
- Avisos e coletas exigem login.
- Só o administrador cria, altera ou remove regiões e avisos.
- O coletor só cria e altera a própria coleta.
- Ninguém consegue se promover a coletor ou administrador pelo cadastro.

A chave (`apiKey`) do Firebase que aparece em `firebase.ts` é a chave pública de um app web e não é um segredo. A proteção dos dados está nas regras acima.

## Tecnologias

**Frontend**
- HTML, CSS e TypeScript (compilado com `tsc`, sem bundler)
- Bootstrap 5 e Bootstrap Icons
- Leaflet.js com mapas do OpenStreetMap

**Backend (Firebase)**
- Firebase Authentication (e-mail e senha)
- Cloud Firestore
- Firebase Hosting

## Estrutura do projeto

```
.
├── docs/                 # Proposta e modelagem
├── firebase.json         # Configuração do Hosting e das regras
├── firestore.rules       # Regras de segurança do Firestore
├── .firebaserc           # Projeto Firebase padrão
├── package.json
├── tsconfig.json
└── frontend/
    ├── index.html        # Login
    ├── cadastro.html     # Criar conta
    ├── src/
    │   ├── ts/           # Lógica em TypeScript (firebase, auth, api, mapa, coleta...)
    │   └── css/          # Estilos
    └── pages/
        ├── publico/      # Cronograma, avisos e mapa
        ├── coletor/      # Painel do coletor
        └── admin/        # Painel administrativo
```

Os arquivos `.js` gerados pela compilação não são versionados. É preciso rodar `npm run build` antes de testar ou publicar.

## Como rodar o projeto

### 1. Pré-requisitos
- Node.js e npm
- Uma conta Google para o Firebase

### 2. Instalar e compilar

```bash
npm install
npm run build
```

### 3. Configurar o Firebase

1. No [console do Firebase](https://console.firebase.google.com), crie um projeto e um app web.
2. Ative **Authentication** (método e-mail/senha) e o **Firestore Database**.
3. Copie a configuração do app para `frontend/src/ts/firebase.ts` e rode `npm run build` de novo.
4. Se usar outro projeto, ajuste o nome em `.firebaserc`.
5. Publique as regras de segurança:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

### 4. Abrir o sistema

Sirva a pasta `frontend/` com uma extensão como o Live Server e abra `index.html`.

A localização do celular só funciona em **HTTPS** ou em `localhost`. Para testar o mapa em um celular, publique um canal de teste:

```bash
npx firebase-tools hosting:channel:deploy teste
```

### 5. Publicar

```bash
npm run build
npx firebase-tools deploy --only hosting
```

### 6. Criar o primeiro administrador

1. Cadastre uma conta em `cadastro.html`.
2. No console do Firebase, copie o **UID** da conta em **Authentication → Usuários**.
3. Em **Firestore → `usuarios` →** documento com esse UID, mude o campo `perfil` para `admin` (ou `coletor`).
4. Saia do sistema e entre de novo.

## Status do projeto

**Entregue:** login e cadastro com três perfis, cronograma público, painel do coletor, mapa com o caminhão em tempo real, avisos e painel administrativo de regiões, avisos e coletas.

**Ainda não implementado:**
- Rotas desenhadas no mapa
- Regiões atendidas e pendentes no mapa
- Tela de gestão de usuários no painel administrativo (hoje a promoção é feita no console do Firebase)
- Edição de avisos
- Vínculo entre avisos e regiões


## Licença

Este projeto está sob a licença especificada no arquivo [LICENSE](./LICENSE).
