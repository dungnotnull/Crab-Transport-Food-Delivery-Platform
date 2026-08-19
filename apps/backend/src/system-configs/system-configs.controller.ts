import { Controller } from '@nestjs/common';
import { SystemConfigsService } from './system-configs.service';

@Controller('system-configs')
export class SystemConfigsController {
  constructor(private readonly systemConfigsService: SystemConfigsService) {}
}
