import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindSalesQueryDto } from './dto/find-sales-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateSaleDto) {
    return this.salesService.create(req.user.id, dto);
  }

  @Get('pending-payments')
  async findPendingPayments(@Request() req: any) {
    return this.salesService.findPendingPayments(req.user);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: FindSalesQueryDto) {
    return this.salesService.findAll(req.user, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.salesService.findOne(id, req.user);
  }

  @Patch(':id/settle-payment')
  async settlePayment(@Param('id') id: string, @Request() req: any) {
    return this.salesService.settlePayment(id, req.user);
  }
}
