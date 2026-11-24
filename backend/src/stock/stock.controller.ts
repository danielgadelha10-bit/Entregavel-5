import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('movements')
  async getMovements(
    @Query('productId') productId?: string,
    @Query('limit') limit?: string,
  ) {
    let parsedLimit = 50;
    if (limit !== undefined && limit !== '') {
      parsedLimit = Number.parseInt(limit, 10);
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException('O parâmetro limit deve ser um número inteiro positivo');
      }
    }
    return this.stockService.getMovements(productId, parsedLimit);
  }

  @Get('low')
  async getLowStock(@Query('threshold') threshold?: string) {
    let parsedThreshold = 5;
    if (threshold !== undefined && threshold !== '') {
      parsedThreshold = Number.parseInt(threshold, 10);
      if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
        throw new BadRequestException('O parâmetro threshold deve ser um número inteiro não negativo');
      }
    }
    return this.stockService.getLowStock(parsedThreshold);
  }
}
