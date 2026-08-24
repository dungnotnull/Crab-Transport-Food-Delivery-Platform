import { Test, TestingModule } from '@nestjs/testing';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { DiscountType } from './entities/coupon.entity';

describe('CouponsController', () => {
  let controller: CouponsController;
  let service: CouponsService;

  const mockCoupon = {
    id: 'coupon-uuid-1',
    code: 'WELCOME10K',
    discount_type: DiscountType.FIXED_AMOUNT,
    discount_value: 10000,
    min_trip_value: 20000,
    max_discount: 10000,
    usage_limit: 100,
    used_count: 5,
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 86400000),
    is_active: true,
  };

  const mockCouponsService = {
    create: jest.fn().mockResolvedValue(mockCoupon),
    findAll: jest.fn().mockResolvedValue([mockCoupon]),
    findActive: jest.fn().mockResolvedValue([mockCoupon]),
    findOne: jest.fn().mockResolvedValue(mockCoupon),
    update: jest.fn().mockResolvedValue(mockCoupon),
    toggleActive: jest.fn().mockResolvedValue({ ...mockCoupon, is_active: false }),
    remove: jest.fn().mockResolvedValue({ success: true, message: 'Coupon deleted' }),
    validateAndCalculateDiscount: jest.fn().mockResolvedValue({
      discountAmount: 10000,
      finalFare: 40000,
      coupon: mockCoupon,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
      ],
    }).compile();

    controller = module.get<CouponsController>(CouponsController);
    service = module.get<CouponsService>(CouponsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a coupon', async () => {
    const result = await controller.create({
      code: 'WELCOME10K',
      discount_type: DiscountType.FIXED_AMOUNT,
      discount_value: 10000,
      usage_limit: 100,
      valid_until: new Date(),
    });
    expect(result).toEqual(mockCoupon);
    expect(service.create).toHaveBeenCalled();
  });

  it('should find all coupons', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([mockCoupon]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find active coupons', async () => {
    const result = await controller.findActive();
    expect(result).toEqual([mockCoupon]);
    expect(service.findActive).toHaveBeenCalled();
  });

  it('should validate a coupon', async () => {
    const result = await controller.validateCoupon({
      code: 'WELCOME10K',
      originalFare: 50000,
    });
    expect(result.discountAmount).toBe(10000);
    expect(result.finalFare).toBe(40000);
  });

  it('should find one coupon by id', async () => {
    const result = await controller.findOne('coupon-uuid-1');
    expect(result).toEqual(mockCoupon);
  });

  it('should update a coupon', async () => {
    const result = await controller.update('coupon-uuid-1', { discount_value: 12000 });
    expect(result).toEqual(mockCoupon);
  });

  it('should toggle active status', async () => {
    const result = await controller.toggleActive('coupon-uuid-1', false);
    expect(result.is_active).toBe(false);
  });

  it('should delete a coupon', async () => {
    const result = await controller.remove('coupon-uuid-1');
    expect(result.success).toBe(true);
  });
});
