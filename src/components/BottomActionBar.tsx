'use client';

// ================================
// BOTTOM ACTION BAR COMPONENT
// ================================

import { ReactNode } from 'react';

interface ActionButton {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'warning' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
}

interface BottomActionBarProps {
  actions: ActionButton[];
}

export function BottomActionBar({ actions }: BottomActionBarProps) {
  const getButtonStyles = (variant: ActionButton['variant'], disabled?: boolean) => {
    const baseStyles = 'flex-1 py-4 sm:py-5 px-4 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]';
    
    if (disabled) {
      return `${baseStyles} bg-gray-200 text-gray-500 cursor-not-allowed`;
    }

    const variantStyles = {
      primary: 'bg-emerald-600 text-white active:bg-emerald-700',
      secondary: 'bg-gray-200 text-gray-800 active:bg-gray-300',
      warning: 'bg-orange-500 text-white active:bg-orange-600',
      danger: 'bg-red-500 text-white active:bg-red-600',
    };

    return `${baseStyles} ${variantStyles[variant]}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe sm:px-6 lg:px-8">
      <div className="flex gap-3 max-w-4xl mx-auto">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={getButtonStyles(action.variant, action.disabled)}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
