# Guia Completo de Implantação na AWS (Amazon Web Services)

Este guia orienta passo a passo a publicação em produção do **Sistema de Gestão Comercial** utilizando a arquitetura recomendada:
- **Frontend:** AWS Amplify Hosting (React + Vite + Tailwind CSS)
- **Backend:** Amazon ECS com AWS Fargate (Node.js + NestJS em contêiner Docker)
- **Banco de Dados:** Amazon RDS PostgreSQL 16
- **Registro de Imagens:** Amazon ECR (Elastic Container Registry)
- **Segurança e Credenciais:** AWS Secrets Manager
- **Monitoramento e Logs:** Amazon CloudWatch

---

## 1. Banco de Dados: Amazon RDS PostgreSQL

1. No console da AWS, acesse **Amazon RDS** > **Databases** > **Create database**.
2. Selecione:
   - **Engine:** PostgreSQL (versão 16.x)
   - **Template:** Free Tier (ou Production conforme necessidade)
   - **DB instance identifier:** `gestao-comercial-db`
   - **Master username:** `postgres`
   - **Master password:** Crie uma senha segura (ex: `SuaSenhaForte2026!`)
   - **DB instance class:** `db.t4g.micro`
   - **Storage:** 20 GiB gp3
   - **VPC & Subnets:** Selecione a sua VPC padrão
   - **Public access:** `Yes` (para rodar a migração inicial localmente) ou `No` se for executar as migrações através de uma VPC interna / bastidor.
   - **Security Group:** Crie um grupo de segurança liberando a porta `5432` (Inbound Rule: TCP 5432).
3. Após o banco atingir o status **Available**, copie o **Endpoint** do RDS (ex: `gestao-comercial-db.c123456789.us-east-1.rds.amazonaws.com`).
4. Execute as migrations do Prisma e o seed a partir do seu terminal local:
   ```bash
   cd backend
   export DATABASE_URL="postgresql://postgres:SuaSenhaForte2026!@gestao-comercial-db.c123456789.us-east-1.rds.amazonaws.com:5432/gestao_comercial?schema=public"
   npx prisma db push
   npm run prisma:seed
   ```

---

## 2. Credenciais: AWS Secrets Manager

Guarde as variáveis sensíveis no AWS Secrets Manager para injeção automática no ECS:

1. Acesse **AWS Secrets Manager** > **Store a new secret**.
2. **Secret 1: DATABASE_URL**
   - **Secret type:** Plaintext / Other type of secret
   - **Secret name:** `gestao-comercial/database-url`
   - **Secret value:** `postgresql://postgres:SuaSenhaForte2026!@gestao-comercial-db.c123456789.us-east-1.rds.amazonaws.com:5432/gestao_comercial?schema=public`
3. **Secret 2: JWT_SECRET**
   - **Secret name:** `gestao-comercial/jwt-secret`
   - **Secret value:** Uma chave criptográfica aleatória e longa (ex: `4a8f9c2d1e0b7f6a5c3e8d2b1f0a9e7d6c5b4a3`)

Copie os ARNs gerados para usar no Task Definition.

---

## 3. Logs: Amazon CloudWatch

1. Acesse o **CloudWatch** > **Log groups**.
2. Clique em **Create log group**.
3. **Log group name:** `/ecs/gestao-comercial-backend`
4. **Retention:** 30 dias (ou à escolha).

---

## 4. Registro de Imagens: Amazon ECR

1. Acesse **Amazon ECR** > **Repositories** > **Create repository**.
2. **Repository name:** `gestao-comercial-backend`
3. No seu terminal, faça o login no ECR, compile a imagem Docker e envie:
   ```bash
   # Defina sua região e ID da conta AWS
   export AWS_REGION="us-east-1"
   export AWS_ACCOUNT_ID="123456789012"
   export REPO_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gestao-comercial-backend"

   # Autenticar no ECR
   aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

   # Build e Tag
   cd backend
   docker build -t $REPO_URI:latest .

   # Push para o Amazon ECR
   docker push $REPO_URI:latest
   ```

---

## 5. Backend: Amazon ECS com AWS Fargate

1. **Criar Target Group no Application Load Balancer (ALB):**
   - Target type: **IP addresses**
   - Protocol: **HTTP**, Port: **3001**
   - Health check path: `/api/auth/me`
   - Sucess codes: `200,401`
2. **Criar o Application Load Balancer:**
   - Name: `gestao-comercial-alb`
   - Scheme: **Internet-facing**
   - Listener: HTTP na porta 80 (ou HTTPS 443 com certificado ACM) encaminhando para o Target Group criado.
   - **URL Pública do Backend:** Guarde o DNS público gerado pelo ALB (ex: `http://gestao-comercial-alb-123456789.us-east-1.elb.amazonaws.com`).
3. **Registrar o Task Definition:**
   - Preencha o arquivo `aws/ecs-backend-task-definition.json` com seu `ACCOUNT_ID` e `AWS_REGION`.
   - Registre na AWS:
     ```bash
     aws ecs register-task-definition --cli-input-json file://aws/ecs-backend-task-definition.json
     ```
4. **Criar o Serviço ECS Fargate:**
   - No cluster ECS (`gestao-comercial-cluster`), crie um serviço apontando para o Task Definition e conectando ao Target Group do ALB.
   - O ECS iniciará as tarefas em Fargate com alta disponibilidade.

---

## 6. Frontend: AWS Amplify

1. Acesse o console da AWS e abra **AWS Amplify**.
2. Clique em **New app** > **Host web app**.
3. Escolha **GitHub** (ou o provedor Git onde seu repositório está versionado) e autorize a AWS.
4. Selecione o repositório `sistema-gestao-comercial` e o branch `main`.
5. Em **App settings**:
   - Defina o **Base directory** como `frontend`.
   - O Amplify detectará automaticamente o arquivo `frontend/amplify.yml`.
6. Em **Advanced settings / Environment variables**, adicione:
   - **Key:** `VITE_API_URL`
   - **Value:** `http://gestao-comercial-alb-123456789.us-east-1.elb.amazonaws.com/api` (URL pública do seu ALB + `/api`)
7. Clique em **Save and deploy**.
8. O Amplify executará as etapas de Build, Verificação e Deploy.

---

## 7. Como Obter a URL Pública da Aplicação

- **URL Pública do Frontend (Aplicação Web Completa):**
  - No painel do **AWS Amplify**, na página do seu aplicativo, você verá o domínio público gerado com HTTPS ativado automaticamente:
    `https://main.d123456abcdefg.amplifyapp.com`
  - *(Opcional)* Você também pode vincular seu próprio domínio personalizado (ex: `app.suaempresa.com.br`) na aba **Domain management** do Amplify.

- **URL Pública da API Backend:**
  - No painel do **EC2 / Load Balancers**, selecione `gestao-comercial-alb` e consulte o campo **DNS name**:
    `http://gestao-comercial-alb-123456789.us-east-1.elb.amazonaws.com/api`
