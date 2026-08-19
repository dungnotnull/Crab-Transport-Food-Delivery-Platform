import { Controller, Post, Body } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

@Controller('api/v1/simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('simulate-trip')
  async simulateTrip(
    @Body('tripId') tripId: string,
  ) {
    this.simulatorService.simulateTrip(tripId);
    return { message: 'Simulation started in background' };
  }
}
