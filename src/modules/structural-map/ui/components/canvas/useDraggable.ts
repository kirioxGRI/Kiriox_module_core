'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ScreenPos } from '@/modules/structural-map/domain/types/ModeloTypes';

/**
 * Reusable hook for making canvas modals/popovers draggable.
 * Follows the same pattern established in RelationFormPopover.
 *
 * @param initialPosition  Screen position where the modal should initially appear
 * @param panelWidth       Width of the panel for edge-clamping
 * @param panelHeight      Estimated height for bottom-clamping
 * @param offset           Vertical offset from the position (default 20)
 */
export function useDraggable(
  initialPosition: ScreenPos,
  panelWidth: number,
  panelHeight: number,
  offset = 20,
) {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  // Compute initial clamped position
  useEffect(() => {
    let left = initialPosition.x - panelWidth / 2;
    let top = initialPosition.y + offset;

    if (typeof window !== 'undefined') {
      if (left < 8) left = 8;
      if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
      if (top + panelHeight > window.innerHeight - 8) top = initialPosition.y - panelHeight - 10;
    }

    setPos({ x: left, y: top });
  }, [initialPosition, panelWidth, panelHeight, offset]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragOffsetRef.current) return;
    setPos({
      x: event.clientX - dragOffsetRef.current.x,
      y: event.clientY - dragOffsetRef.current.y,
    });
  }, []);

  const stopDragging = useCallback(() => {
    dragOffsetRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }, [handlePointerMove]);

  const startDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.closest('[data-draggable-root]')?.getBoundingClientRect()
        ?? event.currentTarget.parentElement?.getBoundingClientRect();
      if (!rect) return;

      dragOffsetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
    },
    [handlePointerMove, stopDragging],
  );

  return { pos, startDragging } as const;
}
