import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';
import { geocodingService } from '../../services/geocoding.service';
import { isResolvedAddressValue } from '../../utils/geocoding.utils';
import type { AddressSuggestion, LocationPoint } from '../../types/trip.types';

interface AddressAutocompleteProps {
  id: string;
  label: string;
  tone: 'pickup' | 'dropoff';
  value: LocationPoint | null;
  onChange: (value: LocationPoint | null) => void;
  bias?: LocationPoint | null;
  placeholder: string;
  disabled?: boolean;
}

type SearchState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  id,
  label,
  tone,
  value,
  onChange,
  bias,
  placeholder,
  disabled = false,
}) => {
  const listboxId = `${useId()}-suggestions`;
  const [query, setQuery] = useState(value?.address ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const editedSelectionRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (value?.address) {
      setQuery(value.address);
    } else if (!editedSelectionRef.current) {
      setQuery('');
    }
    editedSelectionRef.current = false;
  }, [value?.address, value?.lat, value?.lng]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (
      disabled ||
      normalizedQuery.length < 3 ||
      isResolvedAddressValue(query, value)
    ) {
      setSuggestions([]);
      setSearchState('idle');
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      setSearchState('loading');
      setIsOpen(true);

      try {
        const results = await geocodingService.search(
          normalizedQuery,
          bias,
          controller.signal,
        );
        if (requestId !== requestIdRef.current) return;
        setSuggestions(results);
        setSearchState(results.length > 0 ? 'ready' : 'empty');
        setActiveIndex(results.length > 0 ? 0 : -1);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setSearchState('error');
        setActiveIndex(-1);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bias?.lat, bias?.lng, disabled, query, value]);

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    editedSelectionRef.current = false;
    setQuery(suggestion.point.address ?? suggestion.primaryText);
    setSuggestions([]);
    setSearchState('idle');
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(suggestion.point);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setIsOpen(true);

    if (value && !isResolvedAddressValue(nextQuery, value)) {
      editedSelectionRef.current = true;
      onChange(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!isOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  };

  const toneClasses = tone === 'pickup'
    ? 'text-[#00B14F] bg-emerald-50'
    : 'text-[#EF4444] bg-red-50';
  const markerClass = tone === 'pickup' ? 'bg-[#00B14F]' : 'bg-[#EF4444]';
  const showPanel = isOpen && (searchState !== 'idle' || suggestions.length > 0);

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${markerClass}`} aria-hidden="true" />
        {label}
      </label>

      <div className="relative">
        <div className={`absolute left-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg ${toneClasses}`}>
          {tone === 'pickup' ? (
            <MapPin className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={handleKeyDown}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold text-slate-900 outline-none transition-[border-color,box-shadow] placeholder:font-medium placeholder:text-slate-400 focus:border-[#00B14F] focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        {searchState === 'loading' ? (
          <LoaderCircle
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#00B14F]"
            aria-label="Đang tìm địa chỉ"
          />
        ) : value ? (
          <span
            className={`absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${markerClass}`}
            aria-label="Địa chỉ đã được định vị"
          />
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[1000] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          <div id={listboxId} role="listbox" aria-label={`Gợi ý ${label.toLowerCase()}`}>
            {searchState === 'loading' ? (
              <p className="px-4 py-3 text-sm font-medium text-slate-500" role="status">
                Đang tìm địa chỉ…
              </p>
            ) : null}
            {searchState === 'empty' ? (
              <p className="px-4 py-3 text-sm font-medium text-slate-500" role="status">
                Không tìm thấy địa chỉ phù hợp
              </p>
            ) : null}
            {searchState === 'error' ? (
              <p className="px-4 py-3 text-sm font-medium text-red-600" role="alert">
                Không thể tải gợi ý. Bạn vẫn có thể chọn trên bản đồ.
              </p>
            ) : null}
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
                className={`flex min-h-12 w-full items-start gap-3 border-b border-slate-100 px-3.5 py-3 text-left transition-colors last:border-b-0 ${
                  index === activeIndex ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'pickup' ? 'text-[#00B14F]' : 'text-[#EF4444]'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {suggestion.primaryText}
                  </span>
                  {suggestion.secondaryText ? (
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {suggestion.secondaryText}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <p className="bg-slate-50 px-3.5 py-1.5 text-[10px] font-semibold text-slate-400">
            Dữ liệu địa chỉ © OpenStreetMap
          </p>
        </div>
      ) : null}
    </div>
  );
};
