import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export default function ShareCodeForm({ value, onChange, onSubmit, error, onClearError, variant }) {
  const isDesktop = variant === 'desktop'

  const handleChange = (e) => {
    onChange(e.target.value.toUpperCase())
    onClearError()
  }

  const handleClear = () => {
    onChange('')
    onClearError()
  }

  return (
    <form
      onSubmit={onSubmit}
      className={isDesktop ? 'hidden sm:flex items-center gap-2' : 'sm:hidden mt-3 flex items-center gap-2'}
    >
      <div className={cn('relative', !isDesktop && 'flex-1')}>
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Enter share code"
          maxLength={6}
          className={cn(
            'font-mono text-[16px] sm:text-sm',
            isDesktop ? 'w-44' : 'w-full',
            value && 'pr-8',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear input"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="submit" size="sm">
        {isDesktop ? 'Load file' : 'Load'}
      </Button>
    </form>
  )
}
