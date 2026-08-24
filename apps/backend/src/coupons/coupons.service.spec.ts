import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CouponsService } from './coupons.service';
import { Coupon, DiscountType } from './entities/coupon.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('CouponsService', () => {
  let service: CouponsService;
  let mockCouponRepository: any;

  const mockCoupon: Coupon = {
    id: 'coupon-uuid-1',
    code: 'WELCOME10K',
    discount_type: DiscountType.FIXED_AMOUNT,
    discount_value: 10000,
    min_trip_value: 20000,
    max_discount: 10000,
    usage_limit: 100,
    used_count: 5,
    valid_from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockCouponRepository = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((coupon) => Promise.resolve({ id: 'coupon-uuid-1', ...coupon })),
      find: jest.fn().mockResolvedValue([mockCoupon]),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(mockCoupon),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCoupon]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: mockCouponRepository,
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a new coupon', async () => {
      mockCouponRepository.findOne.mockResolvedValue(null);

      const dto = {
        code: 'PROMO20',
        discount_type: DiscountType.PERCENTAGE,
        discount_value: 20,
        usage_limit: 50,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 86400000),
      };

      const result = await service.create(dto);
      expect(result.code).toBe('PROMO20');
      expect(mockCouponRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      mockCouponRepository.findOne.mockResolvedValue(mockCoupon);

      const dto = {
        code: 'WELCOME10K',
        discount_type: DiscountType.FIXED_AMOUNT,
        discount_value: 10000,
        usage_limit: 50,
        valid_until: new Date(Date.now() + 86400000),
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if valid_until is before valid_from', async () => {
      mockCouponRepository.findOne.mockResolvedValue(null);

      const dto = {
        code: 'INVALID_DATES',
        discount_type: DiscountType.FIXED_AMOUNT,
        discount_value: 10000,
        usage_limit: 50,
        valid_from: new Date(Date.now() + 86400000),
        valid_until: new Date(Date.now() - 86400000),
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if percentage discount > 100', async () => {
      mockCouponRepository.findOne.mockResolvedValue(null);

      const dto = {
        code: 'OVER100',
        discount_type: DiscountType.PERCENTAGE,
        discount_value: 150,
        usage_limit: 50,
        valid_until: new Date(Date.now() + 86400000),
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll and findActive', () => {
    it('should return all coupons', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(mockCouponRepository.find).toHaveBeenCalled();
    });

    it('should return active coupons', async () => {
      const result = await service.findActive();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne and update', () => {
    it('should return coupon by ID', async () => {
      mockCouponRepository.findOne.mockResolvedValue(mockCoupon);
      const result = await service.findOne('coupon-uuid-1');
      expect(result.id).toBe('coupon-uuid-1');
    });

    it('should throw NotFoundException if coupon not found by ID', async () => {
      mockCouponRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should update coupon', async () => {
      mockCouponRepository.findOne.mockResolvedValue({ ...mockCoupon });
      const result = await service.update('coupon-uuid-1', { discount_value: 15000 });
      expect(result.discount_value).toBe(15000);
    });
  });

  describe('toggleActive and remove', () => {
    it('should toggle active status', async () => {
      mockCouponRepository.findOne.mockResolvedValue({ ...mockCoupon, is_active: true });
      const result = await service.toggleActive('coupon-uuid-1');
      expect(result.is_active).toBe(false);
    });

    it('should delete a coupon', async () => {
      mockCouponRepository.findOne.mockResolvedValue(mockCoupon);
      const result = await service.remove('coupon-uuid-1');
      expect(result.success).toBe(true);
      expect(mockCouponRepository.remove).toHaveBeenCalledWith(mockCoupon);
    });
  });

  describe('validateAndCalculateDiscount', () => {
    it('should correctly calculate fixed amount discount', async () => {
      mockCouponRepository.findOne.mockResolvedValue(mockCoupon);
      const result = await service.validateAndCalculateDiscount('WELCOME10K', 50000);
      expect(result.discountAmount).toBe(10000);
      expect(result.finalFare).toBe(40000);
    });

    it('should correctly calculate percentage discount with max discount', async () => {
      const percentCoupon: Coupon = {
        ...mockCoupon,
        code: 'CRAB50',
        discount_type: DiscountType.PERCENTAGE,
        discount_value: 50,
        max_discount: 20000,
        min_trip_value: 20000,
      };
      mockCouponRepository.findOne.mockResolvedValue(percentCoupon);
      const result = await service.validateAndCalculateDiscount('CRAB50', 100000);
      expect(result.discountAmount).toBe(20000);
      expect(result.finalFare).toBe(80000);
    });

    it('should throw BadRequestException if fare is below min_trip_value', async () => {
      mockCouponRepository.findOne.mockResolvedValue(mockCoupon);
      await expect(service.validateAndCalculateDiscount('WELCOME10K', 15000)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
