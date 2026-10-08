interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

/**
 * Yükleme göstergesi.
 * Tüm sayfalarda tutarlı spinner kullanımı için bu bileşeni tercih edin.
 *
 * @example
 * if (loading) return <Spinner size="md" />;
 */
export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-indigo-500 border-t-transparent ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Yükleniyor"
    />
  );
}
