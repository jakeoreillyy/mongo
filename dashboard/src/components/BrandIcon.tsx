import { BRANDS, type Brand, brandColor } from '../brands'

export function BrandIcon({ name, className = 'size-5', mono }: { name: Brand; className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} role="img" aria-label={BRANDS[name].title}>
      <path d={BRANDS[name].path} fill={mono ? 'currentColor' : brandColor(name)} />
    </svg>
  )
}
