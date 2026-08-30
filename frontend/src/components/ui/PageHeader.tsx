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

export function PageHeader({ title, description, icon, actionText, actionIcon, onAction, actions, hidePrint = true }: PageHeaderProps) {
  return (
    <div className={`flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 ${hidePrint ? 'print:hidden' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : actionText ? (
        <Button onClick={onAction} variant="primary" leftIcon={actionIcon || <Plus size={18} />}>
          {actionText}
        </Button>
      ) : null}
    </div>
  );
}
