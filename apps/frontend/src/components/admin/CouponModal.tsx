import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Tag, Calendar, DollarSign, Percent, AlertCircle, X, Sparkles } from 'lucide-react';
import type { Coupon, CreateCouponDto, UpdateCouponDto, DiscountType } from '../../types/coupon.types';
import { formatCurrency } from '../../utils/currency.utils';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCouponDto | UpdateCouponDto) => Promise<void>;
  coupon?: Coupon | null;
  isSubmitting?: boolean;
}

export const CouponModal: React.FC<CouponModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  coupon,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(coupon);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minTripValue, setMinTripValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(25000);
  const [usageLimit, setUsageLimit] = useState<number>(500);
  const [validFrom, setValidFrom] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code);
      setDiscountType(coupon.discount_type);
      setDiscountValue(Number(coupon.discount_value));
      setMinTripValue(Number(coupon.min_trip_value) || 0);
      setMaxDiscount(coupon.max_discount ? Number(coupon.max_discount) : undefined);
      setUsageLimit(Number(coupon.usage_limit));
      setValidFrom(coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '');
      setValidUntil(coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '');
      setIsActive(coupon.is_active);
    } else {
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);

      setCode('');
      setDiscountType('PERCENTAGE');
      setDiscountValue(20);
      setMinTripValue(0);
      setMaxDiscount(25000);
      setUsageLimit(500);
      setValidFrom(now.toISOString().slice(0, 16));
      setValidUntil(nextMonth.toISOString().slice(0, 16));
      setIsActive(true);
    }
    setFormError(null);
  }, [coupon, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const formattedCode = code.trim().toUpperCase();
    if (!formattedCode) {
      setFormError('Vui lòng nhập mã khuyến mãi.');
      return;
    }

    if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
      setFormError('Phần trăm giảm giá phải từ 1% đến 100%.');
      return;
    }

    if (discountType === 'FIXED_AMOUNT' && discountValue <= 0) {
      setFormError('Số tiền giảm cố định phải lớn hơn 0 ₫.');
      return;
    }

    if (!validUntil) {
      setFormError('Vui lòng chọn ngày hết hạn.');
      return;
    }

    const fromDate = validFrom ? new Date(validFrom) : new Date();
    const untilDate = new Date(validUntil);

    if (untilDate <= fromDate) {
      setFormError('Ngày hết hạn phải sau ngày bắt đầu.');
      return;
    }

    if (usageLimit <= 0) {
      setFormError('Số lượt sử dụng tối đa phải lớn hơn 0.');
      return;
    }

    try {
      if (isEditing) {
        const payload: UpdateCouponDto = {
          code: formattedCode,
          discount_type: discountType,
          discount_value: discountValue,
          min_trip_value: minTripValue,
          max_discount: discountType === 'PERCENTAGE' ? maxDiscount : undefined,
          usage_limit: usageLimit,
          valid_from: fromDate.toISOString(),
          valid_until: untilDate.toISOString(),
          is_active: isActive,
        };
        await onSubmit(payload);
      } else {
        const payload: CreateCouponDto = {
          code: formattedCode,
          discount_type: discountType,
          discount_value: discountValue,
          min_trip_value: minTripValue,
          max_discount: discountType === 'PERCENTAGE' ? maxDiscount : undefined,
          usage_limit: usageLimit,
          valid_from: fromDate.toISOString(),
          valid_until: untilDate.toISOString(),
          is_active: isActive,
        };
        await onSubmit(payload);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu mã khuyến mãi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-[#00B14F] shadow-xs">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isEditing ? `Chỉnh Sửa Coupon: ${coupon?.code}` : 'Tạo Mã Khuyến Mãi Mới'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing ? 'Cập nhật điều kiện và thời hạn áp dụng' : 'Thiết lập mã giảm giá cho khách hàng'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-5 sm:p-6 text-xs">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-red-600 font-semibold border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Coupon Code & Active Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-code" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mã Khuyến Mãi (Code) *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="coupon-code"
                  type="text"
                  required
                  placeholder="VÍ DỤ: CRAB50, WELCOME10K"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-black tracking-wider text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Trạng Thái Hoạt Động
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex h-10 w-full items-center justify-between rounded-xl px-3 font-bold border transition-colors ${
                  isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                <span>{isActive ? '🟢 Đang kích hoạt' : '⚪ Đang tạm khóa'}</span>
                <span className="text-[10px] font-extrabold underline">Đổi</span>
              </button>
            </div>
          </div>

          {/* Discount Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Loại Giảm Giá *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('PERCENTAGE')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-bold border transition-all ${
                  discountType === 'PERCENTAGE'
                    ? 'border-[#00B14F] bg-emerald-50 text-[#00843D] ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Percent className="h-4 w-4 text-[#00B14F]" />
                <span>Theo Phần Trăm (%)</span>
              </button>

              <button
                type="button"
                onClick={() => setDiscountType('FIXED_AMOUNT')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-bold border transition-all ${
                  discountType === 'FIXED_AMOUNT'
                    ? 'border-[#00B14F] bg-emerald-50 text-[#00843D] ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="h-4 w-4 text-[#00B14F]" />
                <span>Số Tiền Cố Định (₫)</span>
              </button>
            </div>
          </div>

          {/* Discount Value & Max Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="discount-value" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {discountType === 'PERCENTAGE' ? 'Mức Giảm (%) *' : 'Số Tiền Giảm (VND) *'}
              </label>
              <input
                id="discount-value"
                type="number"
                min={1}
                max={discountType === 'PERCENTAGE' ? 100 : undefined}
                required
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === 'PERCENTAGE' ? '20' : '20000'}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {discountType === 'PERCENTAGE' ? `Giảm ${discountValue || 0}% cước chuyến` : `Giảm cố định ${formatCurrency(discountValue || 0)}`}
              </p>
            </div>

            {discountType === 'PERCENTAGE' ? (
              <div>
                <label htmlFor="max-discount" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Giảm Tối Đa (VND)
                </label>
                <input
                  id="max-discount"
                  type="number"
                  min={0}
                  step={1000}
                  value={maxDiscount ?? ''}
                  onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="25000"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tối đa: {maxDiscount ? formatCurrency(maxDiscount) : 'Không giới hạn'}
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="min-trip-value" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Đơn Tối Thiểu (VND)
                </label>
                <input
                  id="min-trip-value"
                  type="number"
                  min={0}
                  step={1000}
                  value={minTripValue || ''}
                  onChange={(e) => setMinTripValue(Number(e.target.value))}
                  placeholder="20000"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Áp dụng cho cuốc từ {formatCurrency(minTripValue)}
                </p>
              </div>
            )}
          </div>

          {/* Usage Limit & Min Trip (if percentage) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {discountType === 'PERCENTAGE' ? (
              <div>
                <label htmlFor="min-trip-value-pct" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Đơn Tối Thiểu (VND)
                </label>
                <input
                  id="min-trip-value-pct"
                  type="number"
                  min={0}
                  step={1000}
                  value={minTripValue || ''}
                  onChange={(e) => setMinTripValue(Number(e.target.value))}
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            ) : null}

            <div className={discountType === 'FIXED_AMOUNT' ? 'sm:col-span-2' : ''}>
              <label htmlFor="usage-limit" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Số Lượt Dùng Tối Đa *
              </label>
              <input
                id="usage-limit"
                type="number"
                min={1}
                required
                value={usageLimit || ''}
                onChange={(e) => setUsageLimit(Number(e.target.value))}
                placeholder="500"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {isEditing && coupon ? (
                <p className="text-[10px] text-slate-400 mt-1">
                  Đã sử dụng: <strong className="text-slate-800">{coupon.used_count}</strong> / {usageLimit} lượt
                </p>
              ) : null}
            </div>
          </div>

          {/* Valid From & Valid Until */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="valid-from" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bắt Đầu Hiệu Lực
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="valid-from"
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="valid-until" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ngày Hết Hạn *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="valid-until"
                  type="datetime-local"
                  required
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs font-bold text-slate-900 focus:border-[#00B14F] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="font-extrabold shadow-md"
            >
              {isEditing ? 'Lưu Thay Đổi' : 'Tạo Coupon'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
