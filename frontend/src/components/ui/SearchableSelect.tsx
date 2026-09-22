import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Ara ve seç...',
  className = '',
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Dışarı tıklamayı yakalamak ve state'i sıfırlamak
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Değer veya odak değiştiğinde arama metnini senkronize et
  useEffect(() => {
    if (!isFocused) {
      setSearchQuery(selectedOption ? selectedOption.label : '');
    }
  }, [value, selectedOption, isFocused]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-white transition-shadow pr-8 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 text-sm'}`}
          placeholder={placeholder}
          value={searchQuery}
          disabled={disabled}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            // Tamamen temizlendiyse seçimi kaldır
            if (e.target.value === '') {
              onChange('');
            }
            // NOT: Kısmi yazımda onChange çağırma — sadece liste filtrele
          }}
          onFocus={() => {
            setIsFocused(true);
            setSearchQuery('');   // Odaklanınca aramayı temizle — tüm liste görünsün
            setIsOpen(true);      // Her zaman açık
          }}
        />
        
        {value && !disabled && (
          <div 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
            onMouseDown={(e) => {
              e.preventDefault(); // Focus kaybetmeyi engelle
              e.stopPropagation();
              onChange('');
              setSearchQuery('');
              setIsOpen(false);
            }}
          >
            <X size={14} />
          </div>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // input blur olmasını engelle
                    onChange(opt.value);
                    setSearchQuery(opt.label);
                    setIsOpen(false);
                    setIsFocused(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center italic">Sonuç bulunamadı</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
