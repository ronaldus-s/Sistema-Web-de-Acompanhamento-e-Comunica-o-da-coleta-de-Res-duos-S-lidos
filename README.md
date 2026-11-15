# Sistema Web de Acompanhamento e Comunicação da Coleta de Resíduos Sólidos em Quixadá

Aplicação web que facilita o acesso da população de Quixadá às informações sobre a coleta de resíduos sólidos, permitindo consultar o status das operações, visualizar a localização atualizada dos veículos de coleta e receber avisos sobre atrasos, interrupções ou alterações nas rotas.

Projeto acadêmico desenvolvido para a disciplina de Fundamentos de Programação Web — UFC Quixadá, com caráter de extensão universitária.

## Sobre o projeto

O cidadão frequentemente tem dificuldade para saber se o veículo de coleta já passou por sua região, quando a coleta está sendo realizada ou se ocorreu alguma alteração no serviço. Um calendário fixo não é suficiente para representar situações como atrasos, interrupções ou mudanças de rota.

Esta aplicação oferece uma alternativa dinâmica: moradores acompanham o status da coleta e a localização dos veículos em tempo real, enquanto profissionais de coleta atualizam as operações através de uma área restrita.

##  Público-alvo

- **Moradores de Quixadá** — consultam informações sobre a coleta em suas regiões
- **Profissionais de coleta** — atualizam o andamento das operações
- **Administradores** — gerenciam dados e usuários do sistema

##  Funcionalidades

### Área pública (sem autenticação)
- Mapa das regiões atendidas
- Status das coletas em tempo real
- Localização atualizada dos veículos em operação
- Avisos publicados pela equipe

### Área do coletor (autenticado)
- Iniciar e finalizar operação de coleta
- Selecionar região/rota atendida
- Atualizar status, informar atrasos e interrupções
- Compartilhar localização periodicamente

### Área administrativa (autenticado)
- CRUD completo de regiões, coletas e avisos
- Gerenciamento de usuários e permissões

##  Entidades e relacionamentos

| Entidade | Depende de | Descrição |
|---|---|---|
| **Região** | — | Bairro/área atendida pelo serviço de coleta |
| **Coleta** | Região (1:N) | Operação de coleta realizada em uma região |
| **Aviso** | Região (1:N) | Comunicação relacionada a uma região |

## Papéis de usuário

| Papel | Permissões |
|---|---|
| **Morador** | Consulta regiões, coletas, mapa e avisos |
| **Coletor** | Inicia/atualiza/finaliza coletas, envia localização |
| **Administrador** | Gerencia regiões, coletas, avisos, usuários e permissões |

##  Tecnologias

**Frontend**
- HTML, CSS, TypeScript
- Bootstrap
- Leaflet.js (mapa interativo)

**Backend**
- Strapi (CMS headless / API REST)
- Autenticação JWT

**Banco de dados**
- SQLite (configuração padrão do Strapi)

**APIs e serviços externos**
- OpenStreetMap / Nominatim — dados cartográficos e geocodificação
- OpenRouteService — cálculo de rota e distância
- ViaCEP — consulta de endereço por CEP

##  Estrutura do projeto

```
.
├── backend/          # Projeto Strapi (API REST + autenticação)
├── docs/             # Proposta, modelagem de entidades e prints
└── frontend/
    ├── index.html
    ├── login.html
    ├── src/
    │   ├── ts/        # Lógica em TypeScript (auth, api, mapa, entidades)
    │   └── css/       # Estilos
    └── pages/
        ├── publico/   # Mapa e avisos (sem autenticação)
        ├── coletor/   # Painel do coletor
        └── admin/     # Painel administrativo
```

##  Como rodar o projeto

### Backend (Strapi)

```bash
cd backend
npm install
npm run develop
```

O painel administrativo do Strapi fica disponível em `http://localhost:1337/admin`.

### Frontend

```bash
cd frontend
# abrir index.html diretamente no navegador,
# ou servir com uma extensão tipo Live Server
```

## Equipe

- [nome do integrante 1]
- [nome do integrante 2]

##  Licença

Este projeto está sob a licença especificada no arquivo [LICENSE](./LICENSE).