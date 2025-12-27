"use client";

import { useState, useRef, useEffect } from "react";
import { GripHorizontal, X } from "lucide-react";

export function DraggableResizable({
  id,
  children,
  title,
  initialWidth = 300,
  initialHeight = 400,
  initialX = 0,
  initialY = 0,
  minWidth = 200,
  minHeight = 200,
  onClose,
  className = "",
  isDraggable = true,
  isResizable = true,
}) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef(null);
  const headerRef = useRef(null);

  // Handle drag
  useEffect(() => {
    if (!isDragging || !isDraggable) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: position.x + (e.clientX - dragStart.x),
        y: position.y + (e.clientY - dragStart.y),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, position, isDraggable]);

  // Handle resize
  useEffect(() => {
    if (!isResizing || !isResizable) return;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(minWidth, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(minHeight, resizeStart.height + (e.clientY - resizeStart.y));

      setSize({
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, minWidth, minHeight, isResizable]);

  const handleDragStart = (e) => {
    if (!isDraggable) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeStart = (e) => {
    if (!isResizable) return;
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        zIndex: isDragging || isResizing ? 1000 : 100,
      }}
      className={className}
    >
      {/* Header */}
      {title && (
        <div
          ref={headerRef}
          onMouseDown={handleDragStart}
          className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 ${
            isDraggable ? "cursor-grab active:cursor-grabbing" : ""
          } select-none`}
        >
          <div className="flex items-center gap-2">
            {isDraggable && <GripHorizontal className="w-4 h-4 text-gray-400" />}
            <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Resize Handle */}
      {isResizable && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-400 opacity-0 hover:opacity-100 cursor-se-resize transition-opacity"
          title="Drag to resize"
          style={{
            borderBottomRightRadius: "0.5rem",
          }}
        />
      )}
    </div>
  );
}
