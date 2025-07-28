'use client'

import React, { memo, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Componente memoizado para listas grandes
interface MemoizedListItemProps {
  id: string
  title: string
  description?: string
  imageUrl?: string
  onClick?: (id: string) => void
  className?: string
}

export const MemoizedListItem = memo(({
  id,
  title,
  description,
  imageUrl,
  onClick,
  className
}: MemoizedListItemProps) => {
  const handleClick = useCallback(() => {
    onClick?.(id)
  }, [id, onClick])

  return (
    <div
      className={cn(
        'flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors',
        className
      )}
      onClick={handleClick}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="h-12 w-12 rounded-lg object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground truncate">
            {description}
          </p>
        )}
      </div>
    </div>
  )
})

MemoizedListItem.displayName = 'MemoizedListItem'

// Componente memoizado para cards
interface MemoizedCardProps {
  title: string
  content: React.ReactNode
  actions?: React.ReactNode
  className?: string
  isSelected?: boolean
}

export const MemoizedCard = memo(({
  title,
  content,
  actions,
  className,
  isSelected = false
}: MemoizedCardProps) => {
  const cardClasses = useMemo(() => 
    cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm transition-all',
      isSelected && 'ring-2 ring-primary',
      className
    ), 
    [className, isSelected]
  )

  return (
    <div className={cardClasses}>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-4">
          {content}
        </div>
        {actions && (
          <div className="mt-6 flex justify-end space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
})

MemoizedCard.displayName = 'MemoizedCard'

// Componente memoizado para tablas de datos
interface MemoizedTableRowProps {
  data: Record<string, any>
  columns: Array<{
    key: string
    header: string
    render?: (value: any, row: Record<string, any>) => React.ReactNode
  }>
  onRowClick?: (data: Record<string, any>) => void
  isSelected?: boolean
}

export const MemoizedTableRow = memo(({
  data,
  columns,
  onRowClick,
  isSelected = false
}: MemoizedTableRowProps) => {
  const handleRowClick = useCallback(() => {
    onRowClick?.(data)
  }, [data, onRowClick])

  const renderedCells = useMemo(() => 
    columns.map((column) => {
      const value = data[column.key]
      return (
        <td key={column.key} className="px-4 py-3">
          {column.render ? column.render(value, data) : value}
        </td>
      )
    }),
    [columns, data]
  )

  return (
    <tr
      className={cn(
        'border-b hover:bg-muted/50 cursor-pointer transition-colors',
        isSelected && 'bg-muted'
      )}
      onClick={handleRowClick}
    >
      {renderedCells}
    </tr>
  )
})

MemoizedTableRow.displayName = 'MemoizedTableRow'

// Componente memoizado para formularios complejos
interface MemoizedFormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const MemoizedFormField = memo(({
  label,
  error,
  required = false,
  children,
  className
}: MemoizedFormFieldProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
})

MemoizedFormField.displayName = 'MemoizedFormField'

// Componente memoizado para métricas/stats
interface MemoizedMetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon?: React.ReactNode
  className?: string
}

export const MemoizedMetricCard = memo(({
  title,
  value,
  change,
  icon,
  className
}: MemoizedMetricCardProps) => {
  const changeColor = useMemo(() => {
    if (!change) return ''
    return change.type === 'increase' ? 'text-green-600' : 'text-red-600'
  }, [change])

  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    return value
  }, [value])

  return (
    <div className={cn(
      'rounded-lg border bg-card p-6 shadow-sm',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{formattedValue}</p>
          {change && (
            <p className={cn('text-sm font-medium', changeColor)}>
              {change.type === 'increase' ? '+' : '-'}
              {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
})

MemoizedMetricCard.displayName = 'MemoizedMetricCard'

// HOC para memoizar cualquier componente con props específicas
export function withMemoization<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual)
  MemoizedComponent.displayName = `Memoized${Component.displayName || Component.name}`
  return MemoizedComponent
}

// HOC para componentes que dependen de arrays/objetos complejos
export function withDeepMemoization<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return memo(Component, (prevProps, nextProps) => {
    // Comparación profunda simple para objetos/arrays
    return JSON.stringify(prevProps) === JSON.stringify(nextProps)
  })
}

// Wrapper para optimizar listas grandes
interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  className?: string
  emptyMessage?: string
}

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  emptyMessage = 'No hay elementos disponibles'
}: OptimizedListProps<T>) {
  const renderedItems = useMemo(() => 
    items.map((item, index) => (
      <div key={keyExtractor(item, index)}>
        {renderItem(item, index)}
      </div>
    )),
    [items, renderItem, keyExtractor]
  )

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {renderedItems}
    </div>
  )
} 