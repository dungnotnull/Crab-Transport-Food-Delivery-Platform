import { useEffect, useRef, useState } from 'react';
import { Gauge, LoaderCircle, Play, Square } from 'lucide-react';
import type { DriverLocationUpdatePayload } from '../../types/socket.types';
import type { LocationPoint, Trip } from '../../types/trip.types';
import {
  createDriverTripSimulationPlan,
  DRIVER_SIMULATION_SPEEDS,
  runDriverTripSimulationPlan,
  type DriverSimulationPhase,
  type DriverSimulationSpeed,
} from '../../utils/driverTripSimulation.utils';
import { getApiErrorMessage } from '../../services/auth.helpers';
import { useToast } from '../common/Toast';

interface DriverTripSimulatorProps {
  trip: Trip;
  currentLocation: Pick<LocationPoint, 'lat' | 'lng'> | null;
  dropoffRoute?: ReadonlyArray<readonly [number, number]>;
  disabled?: boolean;
  isPreparingRoute?: boolean;
  onLocation: (payload: DriverLocationUpdatePayload) => void;
  onRunningChange?: (isRunning: boolean) => void;
}

const SIMULATABLE_STATUSES = new Set<Trip['status']>([
  'ACCEPTED',
  'IN_TRANSIT',
]);

function getPhaseLabel(
  phase: DriverSimulationPhase | null,
  status: Trip['status'],
): string {
  if (phase === 'TO_PICKUP') return 'Tài xế đang đến điểm đón';
  if (phase === 'TO_DROPOFF') return 'Đang chở khách đến điểm đến';
  if (status === 'ACCEPTED') return 'Mô phỏng chặng đến đón khách';
  if (status === 'IN_TRANSIT') return 'Mô phỏng chặng bắt đầu đi';
  return 'Chờ tài xế cập nhật trạng thái thủ công';
}

export function DriverTripSimulator({
  trip,
  currentLocation,
  dropoffRoute,
  disabled = false,
  isPreparingRoute = false,
  onLocation,
  onRunningChange,
}: DriverTripSimulatorProps) {
  const { showToast } = useToast();
  const [speed, setSpeed] = useState<DriverSimulationSpeed>(2);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<DriverSimulationPhase | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    onRunningChange?.(false);
  }, [onRunningChange, trip.id]);

  const setRunningState = (nextValue: boolean) => {
    setIsRunning(nextValue);
    onRunningChange?.(nextValue);
  };

  const stopSimulation = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setRunningState(false);
    setPhase(null);
    showToast('Đã dừng mô phỏng chuyến đi.', 'info');
  };

  const startSimulation = async () => {
    if (
      isRunning ||
      disabled ||
      isPreparingRoute ||
      !SIMULATABLE_STATUSES.has(trip.status)
    ) return;

    const startPoint = currentLocation ?? trip.pickup_location;
    const actions = createDriverTripSimulationPlan({
      tripId: trip.id,
      status: trip.status,
      currentLocation: startPoint,
      pickup: trip.pickup_location,
      dropoff: trip.dropoff_location,
      dropoffRoute,
    });

    if (actions.length === 0) {
      showToast('Trạng thái hiện tại không thể chạy mô phỏng.', 'warning');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProgress(0);
    setRunningState(true);

    try {
      const result = await runDriverTripSimulationPlan(actions, {
        speed,
        signal: controller.signal,
        onLocation: (payload, action) => {
          setPhase(action.phase);
          onLocation(payload);
        },
        onProgress: (completedActions, totalActions) => {
          setProgress(Math.round((completedActions / totalActions) * 100));
        },
      });

      if (result === 'COMPLETED') {
        setProgress(100);
        showToast('Đã mô phỏng xong vị trí xe. Hãy cập nhật trạng thái bằng nút điều khiển thủ công.', 'success');
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        showToast(
          getApiErrorMessage(error, 'Mô phỏng bị dừng vì không thể cập nhật chuyến đi.'),
          'error',
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setRunningState(false);
        setPhase(null);
      }
    }
  };

  const canStart =
    SIMULATABLE_STATUSES.has(trip.status) &&
    !disabled &&
    !isPreparingRoute;

  return (
    <section
      aria-label="Điều khiển mô phỏng chuyến đi"
      className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              {isRunning || isPreparingRoute ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Gauge className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-900">Mô phỏng tài xế chạy cuốc</h4>
              <p
                className="text-[11px] font-semibold text-indigo-700"
                role="status"
                aria-live="polite"
              >
                {isPreparingRoute
                  ? 'Đang tải lộ trình OSRM'
                  : getPhaseLabel(phase, trip.status)}
              </p>
            </div>
          </div>
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700 shadow-sm">
          Frontend dev tool
        </span>
      </div>

      <div
        className="mt-3 grid grid-cols-3 gap-2"
        role="group"
        aria-label="Tốc độ mô phỏng"
      >
        {DRIVER_SIMULATION_SPEEDS.map((candidateSpeed) => (
          <button
            key={candidateSpeed}
            type="button"
            aria-pressed={speed === candidateSpeed}
            disabled={isRunning}
            onClick={() => setSpeed(candidateSpeed)}
            className={`min-h-10 rounded-xl text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              speed === candidateSpeed
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'border border-indigo-100 bg-white text-slate-600 hover:bg-indigo-100'
            }`}
          >
            {candidateSpeed}x
          </button>
        ))}
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-label="Tiến độ mô phỏng"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00B14F] to-indigo-600 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 flex gap-2">
        {isRunning ? (
          <button
            type="button"
            onClick={stopSimulation}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30"
          >
            <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            Dừng mô phỏng
          </button>
        ) : (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => void startSimulation()}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/30 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {isPreparingRoute
              ? 'Đang chuẩn bị lộ trình…'
              : `${trip.status === 'ACCEPTED' ? 'Mô phỏng đến đón khách' : 'Mô phỏng bắt đầu đi'} ${speed}x`}
          </button>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Công cụ chỉ phát vị trí xe ở chặng đến đón khách hoặc bắt đầu đi; mọi trạng thái chuyến đi do tài xế cập nhật thủ công.
      </p>
    </section>
  );
}
