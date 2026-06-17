import React, { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ onSave, onClear, width = 420, height = 110 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (mode !== 'draw') return;
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
    if (!isDrawing || mode !== 'draw') return;
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
    setTypedName('');
    if (onClear) {
      onClear();
    }
  };

  const handleTypeChange = (val) => {
    setTypedName(val);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!val.trim()) {
      setIsEmpty(true);
      if (onClear) onClear();
      return;
    }
    
    setIsEmpty(false);
    ctx.font = "italic 28px 'Brush Script MT', 'Dancing Script', 'Segoe Print', cursive, sans-serif";
    ctx.fillStyle = '#0f0f0f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, canvas.width / 2, canvas.height / 2);
    
    if (onSave) {
      onSave(canvas.toDataURL());
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    handleClear();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Toggles */}
      <div style={{ display: 'flex', gap: '8px' }} className="no-print">
        <button
          type="button"
          onClick={() => handleModeChange('draw')}
          style={{
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: mode === 'draw' ? '#0f0f0f' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: mode === 'draw' ? '#ffffff' : '#475569',
            cursor: 'pointer'
          }}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('type')}
          style={{
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: mode === 'type' ? '#0f0f0f' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: mode === 'type' ? '#ffffff' : '#475569',
            cursor: 'pointer'
          }}
        >
          Type Signature
        </button>
      </div>

      {mode === 'type' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} className="no-print">
          <input
            type="text"
            value={typedName}
            placeholder="Type your name here..."
            onChange={(e) => handleTypeChange(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              width: '100%',
              maxWidth: `${width}px`,
              outline: 'none',
              fontFamily: "'Inter', sans-serif"
            }}
          />
        </div>
      )}

      {/* Signature canvas */}
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
            cursor: mode === 'draw' ? 'crosshair' : 'default',
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
            {mode === 'draw' ? 'Sign with mouse or finger here' : 'Signature preview will appear here'}
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
