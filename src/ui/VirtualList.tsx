import { useState, type ReactNode } from 'react'

interface Props<T> {
  items: readonly T[]
  rowHeight: number
  keyOf: (item: T) => string
  renderRow: (item: T, index: number) => ReactNode
  label: string
}

const EXTRA_ROWS = 8

/**
 * A list that draws only the rows near the visible part. A playlist can have
 * many thousands of channels, and a phone cannot draw all of them at once.
 */
export function VirtualList<T>({ items, rowHeight, keyOf, renderRow, label }: Props<T>) {
  const [top, setTop] = useState(0)
  const [height, setHeight] = useState(800)
  const first = Math.max(0, Math.floor(top / rowHeight) - EXTRA_ROWS)
  const last = Math.min(items.length, Math.ceil((top + height) / rowHeight) + EXTRA_ROWS)

  return (
    <div
      className="virtual-list"
      role="list"
      aria-label={label}
      ref={(node) => {
        if (node && node.clientHeight && node.clientHeight !== height) setHeight(node.clientHeight)
      }}
      onScroll={(e) => {
        setTop(e.currentTarget.scrollTop)
        setHeight(e.currentTarget.clientHeight || height)
      }}
    >
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {items.slice(first, last).map((item, i) => (
          <div key={keyOf(item)} role="listitem" style={{ position: 'absolute', top: (first + i) * rowHeight, left: 0, right: 0, height: rowHeight }}>
            {renderRow(item, first + i)}
          </div>
        ))}
      </div>
    </div>
  )
}
