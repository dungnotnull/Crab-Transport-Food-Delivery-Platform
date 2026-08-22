import React, { useEffect, useRef, useState } from 'react';
import { DriverTripOfferPayload } from '../../types/socket.types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/currency.utils';
import { formatDistance } from '../../utils/geo.utils';
import { getRemainingOfferSeconds } from '../../utils/tripOfferQueue.utils';
import { MapPin, Navigation, BellRing } from 'lucide-react';
import { useToast } from '../common/Toast';
import { SingleFlightGate } from '../../utils/tripRules';

interface TripOfferModalProps {
  offers: DriverTripOfferPayload[];
  onAccept: (tripId: string) => Promise<void> | void;
  onDecline: (tripId: string) => void;
}

export const TripOfferModal: React.FC<TripOfferModalProps> = ({ offers, onAccept, onDecline }) => {
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [acceptingTripId, setAcceptingTripId] = useState<string | null>(null);
  const acceptGateRef = useRef(new SingleFlightGate());
  const expiredOfferKeysRef = useRef(new Set<string>());
  const clockSkewMapRef = useRef(new Map<string, number>());
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpen = offers.length > 0;
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    setCurrentTimeMs(Date.now());
    const timer = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const offerKeys = new Set(offers.map((offer) => `${offer.tripId}:${offer.expiredAt}`));
    expiredOfferKeysRef.current = new Set(
      [...expiredOfferKeysRef.current].filter((key) => offerKeys.has(key)),
    );

    for (const key of clockSkewMapRef.current.keys()) {
      if (!offers.find(o => o.tripId === key)) {
        clockSkewMapRef.current.delete(key);
      }
    }

    offers.forEach((offer) => {
      if (!clockSkewMapRef.current.has(offer.tripId)) {
        const serverCreatedAtMs = Date.parse(offer.expiredAt) - 15000;
        let skew = Date.now() - serverCreatedAtMs;
        if (!Number.isFinite(skew) || Math.abs(skew) > 86400000) {
          skew = 0;
        }
        clockSkewMapRef.current.set(offer.tripId, skew);
      }

      const skew = clockSkewMapRef.current.get(offer.tripId) || 0;
      const adjustedCurrentTimeMs = currentTimeMs - skew;

      const offerKey = `${offer.tripId}:${offer.expiredAt}`;
      if (
        offer.tripId === acceptingTripId ||
        getRemainingOfferSeconds(offer.expiredAt, adjustedCurrentTimeMs) > 0 ||
        expiredOfferKeysRef.current.has(offerKey)
      ) return;

      expiredOfferKeysRef.current.add(offerKey);
      onDecline(offer.tripId);
      showToast('Một cuốc đã hết thời gian nhận.', 'warning');
    });
  }, [acceptingTripId, currentTimeMs, offers, onDecline, showToast]);

  if (!isOpen) return null;

  const handleAcceptTrip = async (tripId: string) => {
    await acceptGateRef.current.run(async () => {
      setAcceptingTripId(tripId);
      try {
        await onAccept(tripId);
      } finally {
        setAcceptingTripId(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md animate-in fade-in duration-200 motion-reduce:animate-none">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-offer-title"
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-3xl border-2 border-emerald-500 bg-white p-5 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#00B14F]">
              <BellRing className="w-5 h-5 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
            </div>
            <div>
              <Badge variant="warning" size="sm">{offers.length} cuốc mới</Badge>
              <h3 id="trip-offer-title" className="text-base font-black text-slate-900">Chọn chuyến phù hợp</h3>
            </div>
          </div>
        </div>

        <div className="flex max-h-[min(64dvh,38rem)] flex-col gap-3 overflow-y-auto pr-1">
          {offers.map((offer) => {
            const skew = clockSkewMapRef.current.get(offer.tripId) || 0;
            const adjustedCurrentTimeMs = currentTimeMs - skew;
            const secondsLeft = getRemainingOfferSeconds(offer.expiredAt, adjustedCurrentTimeMs);
            const isAccepting = acceptingTripId === offer.tripId;

            return (
              <article key={offer.tripId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Thu nhập ước tính</p>
                    <p className="text-xl font-black tracking-tight text-[#00B14F]">{formatCurrency(offer.fare)}</p>
                  </div>
                  <div aria-live="polite" className={`rounded-xl px-2.5 py-1 text-xs font-black ${secondsLeft <= 5 ? 'bg-red-50 text-red-600' : 'bg-white text-slate-700'}`}>
                    {secondsLeft}s
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#00B14F]" aria-hidden="true" />
                    <p className="min-w-0 font-semibold text-slate-800"><span className="font-bold text-slate-500">Đón: </span>{offer.pickup.address || 'Địa chỉ đang cập nhật'}</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" aria-hidden="true" />
                    <p className="min-w-0 font-semibold text-slate-800"><span className="font-bold text-slate-500">Trả: </span>{offer.dropoff.address || 'Địa chỉ đang cập nhật'}</p>
                  </div>
                  <p className="pl-6.5 font-semibold text-slate-500">
                    {typeof offer.distance === 'number' ? formatDistance(offer.distance) : 'Khoảng cách đang cập nhật'}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => onDecline(offer.tripId)}
                    disabled={acceptingTripId !== null}
                    className="font-bold text-slate-600 hover:bg-white"
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={isAccepting}
                    disabled={acceptingTripId !== null || secondsLeft === 0}
                    onClick={() => void handleAcceptTrip(offer.tripId)}
                    className="font-extrabold shadow-md shadow-emerald-600/20"
                  >
                    Nhận cuốc
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
