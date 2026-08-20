import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

@Injectable()
export class SystemConfigsService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigsService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private configRepository: Repository<SystemConfig>,
  ) {}

  async onModuleInit() {
    const defaultConfigs = [
      { key: 'BASE_FARE_BIKE', value: 15000, description: 'Giá mở cửa Xe Máy (VND)' },
      { key: 'RATE_PER_KM_BIKE', value: 5000, description: 'Giá mỗi km Xe Máy (VND)' },
      { key: 'BASE_FARE_CAR_4', value: 25000, description: 'Giá mở cửa Ô tô 4 chỗ (VND)' },
      { key: 'RATE_PER_KM_CAR_4', value: 10000, description: 'Giá mỗi km Ô tô 4 chỗ (VND)' },
      { key: 'BASE_FARE_CAR_7', value: 30000, description: 'Giá mở cửa Ô tô 7 chỗ (VND)' },
      { key: 'RATE_PER_KM_CAR_7', value: 12000, description: 'Giá mỗi km Ô tô 7 chỗ (VND)' },
      { key: 'PLATFORM_COMMISSION_PERCENT', value: 0.2, description: 'Tỷ lệ chiết khấu nền tảng (VD: 0.2 = 20%)' },
      { key: 'MIN_WALLET_BALANCE', value: 100000, description: 'Số dư ví tối thiểu để nhận cuốc (VND)' },
    ];

    for (const conf of defaultConfigs) {
      const exists = await this.configRepository.findOne({ where: { key: conf.key } });
      if (!exists) {
        await this.configRepository.save(this.configRepository.create(conf));
        this.logger.log(`Seeded default config: ${conf.key} = ${conf.value}`);
      }
    }
  }

  async getValue(key: string): Promise<number> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      throw new Error(`System config ${key} not found`);
    }
    return Number(config.value);
  }
}
