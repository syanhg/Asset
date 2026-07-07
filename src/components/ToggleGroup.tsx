export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              'h-[34px] px-4 border border-black text-[12px] transition-opacity-fast cursor-pointer ' +
              (active ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white')
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
