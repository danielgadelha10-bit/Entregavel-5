import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name.trim(),
          unit: dto.unit.trim().toUpperCase(),
          price: dto.price,
          stock: dto.stock,
        },
      });

      if (dto.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: dto.stock,
            type: StockMovementType.ENTRADA,
            reason: 'Estoque inicial de cadastro',
          },
        });
      }

      return product;
    });
  }

  async findAll(search?: string, activeOnly: boolean = false) {
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (activeOnly) {
      where.active = true;
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException('Produto não encontrado');
      }

      // Se o estoque foi alterado manualmente pelo formulário de edição
      if (dto.stock !== undefined && dto.stock !== current.stock) {
        const diff = dto.stock - current.stock;
        const type = diff > 0 ? StockMovementType.ENTRADA : StockMovementType.SAIDA;
        const absDiff = Math.abs(diff);

        await tx.stockMovement.create({
          data: {
            productId: id,
            quantity: absDiff,
            type: diff > 0 ? StockMovementType.ENTRADA : StockMovementType.AJUSTE,
            reason: `Ajuste manual de estoque de ${current.stock} para ${dto.stock}`,
          },
        });
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.unit ? { unit: dto.unit.trim().toUpperCase() } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });

      return updated;
    });
  }

  async adjustStock(id: string, quantity: number, type: StockMovementType, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }

      let newStock = product.stock;
      if (type === StockMovementType.ENTRADA) {
        newStock += quantity;
      } else if (type === StockMovementType.SAIDA) {
        if (product.stock < quantity) {
          throw new BadRequestException(`Estoque insuficiente. Disponível: ${product.stock}`);
        }
        newStock -= quantity;
      } else if (type === StockMovementType.AJUSTE) {
        newStock = quantity;
      }

      await tx.stockMovement.create({
        data: {
          productId: id,
          quantity: Math.abs(newStock - product.stock),
          type,
          reason,
        },
      });

      return tx.product.update({
        where: { id },
        data: { stock: newStock },
      });
    });
  }
}
