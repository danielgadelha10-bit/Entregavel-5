# Sistema de Gestão Comercial

Uma aplicação Web corporativa completa para gerenciamento integrado de **produtos, clientes, estoque, vendas e pagamentos**, projetada com arquitetura escalável e preparada para publicação na **AWS**.

---

## 🚀 Tecnologias

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6, Axios.
- **Backend:** Node.js, NestJS (Arquitetura Modular, Dependency Injection, Validation Pipes).
- **Banco de Dados:** PostgreSQL 16 com Prisma ORM (Migrations, Transações ACID, Client tipado).
- **Autenticação & Segurança:** JWT (JSON Web Tokens) e hash de senhas com Argon2.
- **Testes Automatizados:** Jest (Testes Unitários de Regras de Negócio) e Supertest (Testes de Integração E2E).
- **DevOps & Cloud:** Docker, Docker Compose, AWS Amplify, Amazon ECS com Fargate, Amazon RDS PostgreSQL, Amazon ECR, AWS Secrets Manager e Amazon CloudWatch.

---

## 💼 Funcionalidades e Regras de Negócio Implementadas

1. **Autenticação & Controle de Acesso (RBAC):**
   - **ADMIN:** Primeiro usuário cadastrado no sistema recebe automaticamente este perfil. Gerencia produtos, clientes e usuários, consulta histórico de todas as vendas e gera relatórios consolidados.
   - **OPERADOR:** Demais usuários cadastrados recebem este perfil. Consulta produtos e estoque, consulta e cadastra clientes, registra vendas e visualiza exclusivamente suas próprias vendas.
   - Todas as rotas privadas exigem JWT e validam permissões via Guards (`JwtAuthGuard`, `RolesGuard`).

2. **Produtos e Estoque:**
   - Cadastro e edição de produtos com nome, unidade (UN, KG, CX, LT, etc.), preço e estoque.
   - **Valores monetários armazenados em centavos (integers)** no PostgreSQL para evitar erros de ponto flutuante (ex: R$ 38,50 = `3850`).
   - Movimentações de estoque registradas em histórico (`stock_movements`) com tipo (`ENTRADA`, `SAIDA`, `AJUSTE`) e motivo.

3. **Vendas e Ponto de Venda (PDV):**
   - Venda com múltiplos produtos e clientes.
   - **Transação ACID no PostgreSQL (`prisma.$transaction`):** baixa imediata de estoque para todos os produtos vendidos.
   - **Validação Estrita:** se faltar estoque para qualquer item da lista, **toda a venda é abortada e revertida** com mensagem de erro clara.
   - **Preservação de Preço:** o preço praticado no instante da venda é salvo individualmente em `sale_items`, imune a futuras alterações de preço do produto.

4. **Pagamentos e Contas a Receber:**
   - **À Vista:** Venda registrada como `PAGO` imediatamente com registro da data/hora da quitação (`paidAt`).
   - **A Prazo:** Venda registrada como `PENDENTE`, exibida na tela de *Pagamentos Pendentes*.
   - **Baixa Única:** Cada pagamento pendente só pode sofrer baixa uma única vez. Tentativas posteriores são rejeitadas pelo backend.

5. **Relatórios e Dashboard:**
   - **Dashboard:** Métricas de faturamento total, faturamento do mês corrente, valores recebidos, valores a receber em aberto, alertas de estoque crítico (≤ 5 unidades) e gráfico diário dos últimos 7 dias.
   - **Relatórios:** Filtro por período de datas com demonstrativo **agrupado por cliente**, total gasto, total quitado, valores em aberto e lista detalhada de pedidos, com função de impressão/PDF.

---

## 📂 Estrutura do Projeto

```
sistema-gestao-comercial/
├── backend/                  # API NestJS
│   ├── src/
│   │   ├── auth/             # Autenticação JWT, Argon2, Guards e Decorators
│   │   ├── users/            # Gestão de Usuários e Perfis (ADMIN)
│   │   ├── products/         # Catálogo de Produtos e Ajustes de Estoque
│   │   ├── clients/          # Cadastro de Clientes
│   │   ├── sales/            # Vendas, Transações e Baixa de Pagamento
│   │   ├── stock/            # Histórico de Movimentações de Estoque
│   │   ├── reports/          # Relatórios por Período Agrupados por Cliente
│   │   ├── dashboard/        # Indicadores Financeiros e Operacionais
│   │   └── prisma/           # Serviço de Conexão Prisma Client
│   ├── prisma/
│   │   ├── schema.prisma     # Modelagem das 6 tabelas relacionais
│   │   └── seed.ts           # Carga de dados inicial para testes
│   ├── test/                 # Testes E2E com Supertest
│   └── Dockerfile            # Imagem de produção para Amazon ECS Fargate
├── frontend/                 # Aplicação React + Vite
│   ├── src/
│   │   ├── api/              # Cliente Axios com interceptor de JWT
│   │   ├── context/          # Contexto de Autenticação e Permissões
│   │   ├── pages/            # Telas: Login, Register, Dashboard, Produtos,
│   │   │                     # Clientes, Nova Venda, Histórico, Pendentes,
│   │   │                     # Relatórios, Usuários
│   │   ├── components/       # Layout, Navbar, Sidebar, Modal, StatCard
│   │   └── utils/            # Formatadores monetários em centavos e datas
│   ├── amplify.yml           # Configuração de build para AWS Amplify
│   └── Dockerfile            # Imagem Nginx para frontend
├── aws/                      # Modelos e Guia de Publicação na AWS
│   ├── deploy-guide.md       # Guia passo a passo com comandos e URLs
│   ├── ecs-backend-task-definition.json
│   ├── ecs-service.json
│   └── buildspec.yml
├── docker-compose.yml        # Orquestração local (DB + Backend + Frontend)
└── README.md
```

---

## 🏃 Como Executar Localmente

### Opção 1: Com Docker Compose (Recomendado)

Suba o banco de dados PostgreSQL, a API NestJS e o Frontend com um único comando:

```bash
docker-compose up --build -d
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api

---

### Opção 2: Execução Direta (Node.js + PostgreSQL Local)

#### 1. Configurar e Iniciar o Backend
```bash
cd backend
npm install

# Copie o arquivo de variáveis de ambiente e ajuste a DATABASE_URL
cp .env.example .env

# Gerar o Prisma Client e aplicar migrações no banco
npx prisma db push

# (Opcional) Executar o seed de demonstração com usuários e produtos
npm run prisma:seed

# Iniciar o servidor em modo de desenvolvimento
npm run start:dev
```
A API estará acessível em `http://localhost:3001/api`.

#### 2. Iniciar o Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse a aplicação em `http://localhost:3000`.

---

## 🔐 Credenciais de Demonstração (Seed)

Caso tenha executado `npm run prisma:seed`:

| Perfil | E-mail | Senha | Permissões |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@comercial.com` | `admin123` | Acesso total: Produtos, Clientes, Usuários, Vendas e Relatórios |
| **OPERADOR** | `operador@comercial.com` | `operador123` | Ponto de Venda: Consulta produtos/estoque, clientes e registra vendas |

> *Nota:* Ao registrar um novo usuário pela tela de cadastro, se o banco estiver vazio, ele será automaticamente configurado como **ADMIN**. Os cadastros subsequentes recebem perfil **OPERADOR**.

---

## 🧪 Execução de Testes Automatizados

No diretório `backend`:

- **Testes Unitários das Regras de Negócio (Jest):**
  ```bash
  npm test
  ```
  *Testa:*
  - Atribuição de perfil ADMIN ao primeiro usuário e OPERADOR aos demais.
  - Criptografia com Argon2.
  - Transação PostgreSQL e rollback completo em caso de estoque insuficiente.
  - Preservação do preço histórico de produtos vendidos.
  - Vendas a prazo iniciando como pendentes e vendas à vista como pagas.
  - Baixa de pagamento pendente realizada com sucesso e rejeição estrita de segunda baixa.

- **Testes de Integração E2E (Supertest):**
  ```bash
  npm run test:e2e
  ```

---

## ☁️ Publicação na AWS e Obtenção da URL Pública

O guia completo com todos os passos detalhados está disponível em [`aws/deploy-guide.md`](aws/deploy-guide.md).

### Resumo do Fluxo na AWS:

1. **Amazon RDS PostgreSQL:** Criar a instância de banco de dados e aplicar o schema com `npx prisma db push`.
2. **AWS Secrets Manager:** Armazenar `DATABASE_URL` e `JWT_SECRET`.
3. **Amazon ECR:** Criar repositório `gestao-comercial-backend` e enviar a imagem Docker do backend.
4. **Amazon ECS (Fargate) + CloudWatch:** Registrar o Task Definition com logs no CloudWatch e criar o serviço com Application Load Balancer.
   - **URL Pública da API:** DNS fornecido pelo Load Balancer (ex: `http://gestao-comercial-alb-123456789.us-east-1.elb.amazonaws.com/api`).
5. **AWS Amplify:** Conectar o repositório GitHub, configurar a variável `VITE_API_URL` apontando para o Load Balancer e disparar o deploy contínuo.
   - **URL Pública do Frontend:** Domínio HTTPS seguro gerado automaticamente pelo Amplify (ex: `https://main.d123456abcdefg.amplifyapp.com`).
