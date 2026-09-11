import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from './Button';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  actions?: React.ReactNode;
  hidePrint?: boolean;
}

export function PageHeader({
  title,
  description,
  icon,
  actionText,
  actionIcon,
  onAction,
  actions,
  hidePrint = true,
}: PageHeaderProps) {
  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-6 py-4 rounded-xl shadow-md mb-6 overflow-hidden ${hidePrint ? 'print:hidden' : ''}`}
      style={{
        background: 'linear-gradient(120deg, #1e3a5f 0%, #1d4ed8 60%, #2563eb 100%)',
        minHeight: '72px',
      }}
    >
      {/* Hafif diyagonal desen (tekstür hissi) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)',
        }}
      />

      {/* Sol — İkon + Başlık */}
      <div className="relative flex items-center gap-4 min-w-0">
        {/* İkon kutusu */}
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)' }}
        >
          {icon}
        </div>

        {/* Başlık metni */}
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-white leading-snug tracking-tight truncate">
            {title}
          </h1>
          <p
            className="text-[13px] leading-snug truncate mt-0.5"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Sağ — Aksiyon Butonları */}
      {actions ? (
        <div className="relative flex items-center gap-2 shrink-0" data-dark-header="true">
          {actions}
        </div>
      ) : actionText ? (
        <div className="relative shrink-0" data-dark-header="true">
          <Button onClick={onAction} variant="primary" leftIcon={actionIcon || <Plus size={18} />}>
            {actionText}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
