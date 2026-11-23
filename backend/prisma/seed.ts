import { PrismaClient, Role, PaymentType, PaymentStatus, StockMovementType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpeza de tabelas para seed limpo
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Usuários (O primeiro é ADMIN, o segundo é OPERADOR)
  const passwordHash = await argon2.hash('admin123');
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador Master',
      email: 'admin@comercial.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const opPasswordHash = await argon2.hash('operador123');
  const operadorUser = await prisma.user.create({
    data: {
      name: 'Carlos Vendedor',
      email: 'operador@comercial.com',
      password: opPasswordHash,
      role: Role.OPERADOR,
    },
  });

  console.log('✅ Usuários criados:');
  console.log(`   - ADMIN: admin@comercial.com (senha: admin123)`);
  console.log(`   - OPERADOR: operador@comercial.com (senha: operador123)`);

  // 2. Criar Produtos com preços em centavos
  const productsData = [
    { name: 'Cimento CP II 50KG', unit: 'SC', price: 3850, stock: 120 }, // R$ 38,50
    { name: 'Tinta Acrílica Fosca 18L', unit: 'GL', price: 28990, stock: 25 }, // R$ 289,90
    { name: 'Furadeira de Impacto 750W', unit: 'UN', price: 34900, stock: 8 }, // R$ 349,00
    { name: 'Fita Isolante 20m 3M', unit: 'UN', price: 1250, stock: 150 }, // R$ 12,50
    { name: 'Chave de Fenda Philips 1/4x6', unit: 'UN', price: 2490, stock: 45 }, // R$ 24,90
    { name: 'Tubo PVC Soldável 25mm 6m', unit: 'BR', price: 2980, stock: 60 }, // R$ 29,80
    { name: 'Argamassa ACIII 20KG', unit: 'SC', price: 3200, stock: 80 }, // R$ 32,00
    { name: 'Luva de Proteção PU Tamanho G', unit: 'PAR', price: 990, stock: 4 }, // Estoque baixo: 4
  ];

  const products = [];
  for (const p of productsData) {
    const created = await prisma.product.create({ data: p });
    products.push(created);

    await prisma.stockMovement.create({
      data: {
        productId: created.id,
        quantity: created.stock,
        type: StockMovementType.ENTRADA,
        reason: 'Estoque inicial cadastrado',
      },
    });
  }
  console.log(`✅ ${products.length} produtos cadastrados com movimentação de estoque inicial`);

  // 3. Criar Clientes
  const clientsData = [
    { name: 'Construtora Silva & Filhos', phone: '(11) 98765-4321', email: 'contato@silvaconstrucoes.com.br' },
    { name: 'Metalúrgica Brasil Ltda', phone: '(19) 99123-4567', email: 'compras@metalurgicabrasil.com' },
    { name: 'João Pedro Souza', phone: '(11) 97654-3210', email: 'joao.pedro@gmail.com' },
    { name: 'Ana Maria Ferreira', phone: '(21) 98111-2233', email: 'anamaria.decor@hotmail.com' },
  ];

  const clients = [];
  for (const c of clientsData) {
    const created = await prisma.client.create({ data: c });
    clients.push(created);
  }
  console.log(`✅ ${clients.length} clientes cadastrados`);

  // 4. Criar Vendas de Exemplo (Uma À Vista já Paga e Uma A Prazo Pendente)
  // Venda 1: À Vista (PAGO)
  const item1P = products[0]; // Cimento
  const item2P = products[3]; // Fita Isolante
  const qty1 = 5;
  const qty2 = 10;
  const total1 = (item1P.price * qty1) + (item2P.price * qty2);

  const sale1 = await prisma.sale.create({
    data: {
      sellerId: operadorUser.id,
      clientId: clients[0].id,
      paymentType: PaymentType.A_VISTA,
      paymentStatus: PaymentStatus.PAGO,
      total: total1,
      paidAt: new Date(),
      items: {
        create: [
          { productId: item1P.id, quantity: qty1, unitPrice: item1P.price, totalPrice: item1P.price * qty1 },
          { productId: item2P.id, quantity: qty2, unitPrice: item2P.price, totalPrice: item2P.price * qty2 },
        ],
      },
    },
  });

  // Atualizar estoque e registrar movimento da venda 1
  await prisma.product.update({ where: { id: item1P.id }, data: { stock: { decrement: qty1 } } });
  await prisma.product.update({ where: { id: item2P.id }, data: { stock: { decrement: qty2 } } });
  await prisma.stockMovement.create({
    data: { productId: item1P.id, quantity: qty1, type: StockMovementType.SAIDA, reason: `Venda #${sale1.id.slice(0, 8)}`, saleId: sale1.id },
  });
  await prisma.stockMovement.create({
    data: { productId: item2P.id, quantity: qty2, type: StockMovementType.SAIDA, reason: `Venda #${sale1.id.slice(0, 8)}`, saleId: sale1.id },
  });

  // Venda 2: A Prazo (PENDENTE)
  const item3P = products[1]; // Tinta
  const item4P = products[2]; // Furadeira
  const qty3 = 2;
  const qty4 = 1;
  const total2 = (item3P.price * qty3) + (item4P.price * qty4);

  const sale2 = await prisma.sale.create({
    data: {
      sellerId: adminUser.id,
      clientId: clients[1].id,
      paymentType: PaymentType.A_PRAZO,
      paymentStatus: PaymentStatus.PENDENTE,
      total: total2,
      paidAt: null,
      items: {
        create: [
          { productId: item3P.id, quantity: qty3, unitPrice: item3P.price, totalPrice: item3P.price * qty3 },
          { productId: item4P.id, quantity: qty4, unitPrice: item4P.price, totalPrice: item4P.price * qty4 },
        ],
      },
    },
  });

  await prisma.product.update({ where: { id: item3P.id }, data: { stock: { decrement: qty3 } } });
  await prisma.product.update({ where: { id: item4P.id }, data: { stock: { decrement: qty4 } } });
  await prisma.stockMovement.create({
    data: { productId: item3P.id, quantity: qty3, type: StockMovementType.SAIDA, reason: `Venda #${sale2.id.slice(0, 8)}`, saleId: sale2.id },
  });
  await prisma.stockMovement.create({
    data: { productId: item4P.id, quantity: qty4, type: StockMovementType.SAIDA, reason: `Venda #${sale2.id.slice(0, 8)}`, saleId: sale2.id },
  });

  console.log(`✅ 2 vendas de exemplo cadastradas (1 À Vista PAGA e 1 A Prazo PENDENTE)`);
  console.log('🚀 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
