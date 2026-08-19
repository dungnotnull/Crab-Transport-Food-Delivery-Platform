import { Controller, Post, Body } from '@nestjs/common';
import { SimulatorService } from './simulator.service';

@Controller('api/v1/simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('simulate-trip')
  async startSimulation(
    @Body('orderId') orderId: string,
    @Body('simulateFoodWait') simulateFoodWait: boolean = true,
  ) {
    this.simulatorService.simulateTrip(orderId, simulateFoodWait);
    return { message: '2-Leg Simulation started in the background.' };
  }
}
