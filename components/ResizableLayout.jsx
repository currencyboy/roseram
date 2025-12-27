"use client";

import { useState, useRef, useEffect } from "react";

export function ResizableLayout({
  children,
  initialSizes = [20, 50, 30],
  direction = "horizontal",
  minSize = 150,
  className = "",
}) {
  const [sizes, setSizes] = useState(initialSizes);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (dragIndex === null) return;

      const container = containerRef.current;
      if (!container) return;

      const isHorizontal = direction === "horizontal";
      const containerSize = isHorizontal ? container.offsetWidth : container.offsetHeight;
      const mousePos = isHorizontal ? e.clientX : e.clientY;
      const containerPos = isHorizontal
        ? container.getBoundingClientRect().left
        : container.getBoundingClientRect().top;

      const relativePos = mousePos - containerPos;
      const percentage = (relativePos / containerSize) * 100;

      setSizes((prevSizes) => {
        const newSizes = [...prevSizes];
        const totalSize = newSizes.reduce((a, b) => a + b, 0);

        if (dragIndex === 0) {
          newSizes[0] = Math.max(minSize, Math.min(percentage, 100 - minSize * newSizes.length));
        } else if (dragIndex === newSizes.length - 1) {
          newSizes[dragIndex] = Math.max(minSize, 100 - newSizes.slice(0, -1).reduce((a, b) => a + b, 0));
        } else {
          newSizes[dragIndex] = Math.max(minSize, percentage - newSizes.slice(0, dragIndex).reduce((a, b) => a + b, 0));
        }

        return newSizes;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragIndex(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragIndex, direction, minSize]);

  const handleDragStart = (index) => {
    setIsDragging(true);
    setDragIndex(index);
  };

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? "flex-row" : "flex-col"} ${className}`}
      style={{ height: "100%", width: "100%" }}
    >
      {children.map((child, index) => (
        <div key={index} style={{ flex: `${sizes[index]} 1 0%`, display: "flex" }}>
          {child}
          {index < children.length - 1 && (
            <div
              onMouseDown={() => handleDragStart(index)}
              className={`${
                isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
              } bg-gray-300 hover:bg-blue-500 transition-colors select-none`}
              style={{
                userSelect: "none",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
