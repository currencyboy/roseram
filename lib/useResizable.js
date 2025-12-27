import { useRef, useState, useCallback, useEffect } from 'react';

export function useResizable(initialWidth, minWidth = 300, maxWidth = null) {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const startXRef = useRef(null);
  const startWidthRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || startXRef.current === null) return;

    const deltaX = e.clientX - startXRef.current;
    let newWidth = startWidthRef.current + deltaX;

    if (newWidth < minWidth) newWidth = minWidth;
    if (maxWidth && newWidth > maxWidth) newWidth = maxWidth;

    setWidth(newWidth);
  }, [isDragging, minWidth, maxWidth]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    width,
    setWidth,
    isDragging,
    handleMouseDown,
    containerRef,
  };
}
