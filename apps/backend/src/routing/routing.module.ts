import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RoutingService } from './routing.service';

@Module({
  imports: [HttpModule],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
