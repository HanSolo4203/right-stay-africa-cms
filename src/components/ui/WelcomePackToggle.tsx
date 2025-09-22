'use client';

interface WelcomePackToggleProps {
  fee: number;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

export default function WelcomePackToggle({ fee, checked, disabled, onChange }: WelcomePackToggleProps) {
  return (
    <div>
      <label className="inline-flex items-center space-x-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          disabled={disabled}
        />
        <span className="text-sm text-gray-700">Add Welcome pack ({`R${fee.toFixed(2)}`})</span>
      </label>
      <p className="mt-1 text-xs text-gray-500">A once-off welcome pack fee that can be configured in settings.</p>
    </div>
  );
}


