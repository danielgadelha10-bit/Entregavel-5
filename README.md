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

#### 1. Pré-requisitos (Docker Desktop)
Certifique-se de que o **Docker Desktop** está instalado e em execução no computador:
```bash
docker --version
docker compose version
```
> **No Windows 10/11:** Caso o Docker não esteja instalado, habilite o WSL 2 (`wsl --install` como Administrador e reinicie se solicitado), instale o **Docker Desktop** (`winget install -e --id Docker.DockerDesktop` ou pelo site oficial da Docker) e abra o aplicativo até o motor iniciar.

#### 2. Configurar Variáveis de Ambiente
Na raiz do projeto, copie o arquivo de exemplo para criar o `.env` local (ignorado pelo Git) e ajuste se desejar personalizar portas ou chaves:
```powershell
# PowerShell (Windows)
Copy-Item .env.example .env
```
```bash
# Linux / macOS / Git Bash
cp .env.example .env
```

#### 3. Inicializar os Containers (PostgreSQL 16 + Backend + Frontend)
Na raiz do projeto, execute:
```bash
docker compose up --build -d
```
Esse único comando sobe o PostgreSQL 16 com volume persistente, aplica automaticamente o schema do Prisma no banco, inicia a API NestJS e serve o Frontend React via Nginx.

#### 4. Acessar a Aplicação
- **Frontend (Aplicação Web):** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Healthcheck da API:** http://localhost:3001/api/health

> *(Opcional)* Para popular o banco Docker com dados iniciais de demonstração:
> ```bash
> docker compose exec backend npm run prisma:seed:prod
> ```

#### 5. Comandos Úteis e Encerramento
- **Verificar status dos containers:**
  ```bash
  docker compose ps
  ```
- **Acompanhar logs:**
  ```bash
  docker compose logs -f
  ```
- **Encerrar os containers (mantendo os dados do banco preservados):**
  ```bash
  docker compose down
  ```
- **Encerrar e apagar também o volume do banco de dados:**
  ```bash
  docker compose down -v
  ```

---

### Opção 2: Execução Direta (Node.js + PostgreSQL Local)

#### 1. Configurar e Iniciar o Backend
```bash
cd backend
npm install

# Copie o arquivo de variáveis de ambiente e ajuste a DATABASE_URL com seu PostgreSQL local
cp .env.example .env

# Gerar o Prisma Client e aplicar o schema no banco
npx prisma generate
npx prisma db push

# (Opcional) Executar o seed de demonstração com usuários, produtos e clientes
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

## 🔐 Usuários Iniciais e Seed de Demonstração

Ao abrir o sistema com o banco vazio e cadastrar a primeira conta na tela de registro (`/register`), o primeiro usuário recebe automaticamente o perfil **ADMIN**, e os cadastros seguintes recebem o perfil **OPERADOR**.

Caso opte por executar o script de demonstração (`backend/prisma/seed.ts`), ele cria dois usuários de exemplo (ADMIN e OPERADOR), produtos, clientes e vendas iniciais — consulte e altere as senhas padrão diretamente em `backend/prisma/seed.ts` antes de usar fora de ambiente de testes.

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
