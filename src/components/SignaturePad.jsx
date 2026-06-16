import React, { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ onSave, onClear, width = 400, height = 120 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    // Support mouse events
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    // Prevent scrolling when drawing on touch screens
    if (e.cancelable) {
      e.preventDefault();
    }
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
    
    if (onSave) {
      onSave(canvas.toDataURL());
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    if (onClear) {
      onClear();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: `${width}px` }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: '#f8fafc',
            cursor: 'crosshair',
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: `${height}px`
          }}
        />
        {isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '13px',
              pointerEvents: 'none',
              fontStyle: 'italic'
            }}
          >
            Sign with mouse or finger here
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: '600',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          color: '#475569',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f1f5f9';
          e.target.style.color = '#0f172a';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#ffffff';
          e.target.style.color = '#475569';
        }}
      >
        Clear Signature
      </button>
    </div>
  );
}
