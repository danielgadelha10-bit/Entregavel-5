import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
    return this.stockService.getMovements(productId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('low')
  async getLowStock(@Query('threshold') threshold?: string) {
    return this.stockService.getLowStock(threshold ? parseInt(threshold, 10) : 5);
  }
}
