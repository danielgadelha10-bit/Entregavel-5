import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentStatus, PaymentType } from '@prisma/client';

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
  async findAll(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clientId') clientId?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('paymentType') paymentType?: PaymentType,
  ) {
    return this.salesService.findAll(req.user, {
      startDate,
      endDate,
      clientId,
      paymentStatus,
      paymentType,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.salesService.findOne(id, req.user);
  }

  @Patch(':id/settle-payment')
  async settlePayment(@Param('id') id: string) {
    return this.salesService.settlePayment(id);
  }
}
