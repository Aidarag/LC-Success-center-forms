import React from 'react';

/**
 * LivingstoneLogo Component
 * Renders a high-fidelity SVG representation of the Livingstone College Success Center logo.
 * Supports different variants:
 * - 'icon': Just the columns emblem.
 * - 'horizontal': The emblem with text on the right (ideal for headers).
 * - 'vertical': The emblem with text below it (ideal for login/homepage).
 */
export default function LivingstoneLogo({ variant = 'horizontal', size = 'md', className = '' }) {
  const sizeMap = {
    sm: { icon: 32, text: 'text-sm' },
    md: { icon: 48, text: 'text-base' },
    lg: { icon: 80, text: 'text-xl' },
    xl: { icon: 120, text: 'text-3xl' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // The columns emblem SVG
  const Emblem = () => (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="livingstone-emblem"
      id="livingstone-logo-svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Outer Circle with brand border */}
      <circle cx="50" cy="50" r="46" stroke="#A7CBE5" strokeWidth="2.5" fill="#FFFFFF" />
      <circle cx="50" cy="50" r="41" stroke="#000000" strokeWidth="1" fill="none" />
      
      {/* Price Administration Building Columns Silhouette */}
      <g id="columns-silhouette">
        {/* Pediment (Triangle Top) */}
        <path d="M22 36 L78 36 L50 22 Z" fill="#000000" />
        
        {/* Architrave (Horizontal band under triangle) */}
        <rect x="24" y="38" width="52" height="4" fill="#000000" rx="1" />
        <rect x="25" y="43" width="50" height="2" fill="#A7CBE5" />
        
        {/* 4 Pillars / Columns */}
        {/* Column 1 */}
        <rect x="29" y="46" width="5" height="24" fill="#000000" />
        <rect x="28" y="45" width="7" height="2" fill="#000000" />
        <rect x="28" y="70" width="7" height="2" fill="#000000" />

        {/* Column 2 */}
        <rect x="41" y="46" width="5" height="24" fill="#000000" />
        <rect x="40" y="45" width="7" height="2" fill="#000000" />
        <rect x="40" y="70" width="7" height="2" fill="#000000" />

        {/* Column 3 */}
        <rect x="54" y="46" width="5" height="24" fill="#000000" />
        <rect x="53" y="45" width="7" height="2" fill="#000000" />
        <rect x="53" y="70" width="7" height="2" fill="#000000" />

        {/* Column 4 */}
        <rect x="66" y="46" width="5" height="24" fill="#000000" />
        <rect x="65" y="45" width="7" height="2" fill="#000000" />
        <rect x="65" y="70" width="7" height="2" fill="#000000" />
        
        {/* Stylobate (Base steps) */}
        {/* Step 1 */}
        <rect x="22" y="72" width="56" height="4" fill="#000000" rx="1" />
        {/* Step 2 */}
        <rect x="18" y="76" width="64" height="4" fill="#A7CBE5" rx="1" />
        {/* Step 3 */}
        <rect x="14" y="80" width="72" height="4" fill="#000000" rx="1" />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return <Emblem />;
  }

  if (variant === 'vertical') {
    return (
      <div className={`livingstone-logo-vertical ${className}`} style={{ textAlign: 'center' }}>
        <Emblem />
        <div style={{ marginTop: '1rem' }}>
          <h1 style={{ 
            fontFamily: "'Outfit', sans-serif", 
            fontWeight: '800', 
            fontSize: size === 'xl' ? '2.25rem' : '1.5rem', 
            letterSpacing: '0.05em',
            margin: '0', 
            color: '#000000',
            textTransform: 'uppercase'
          }}>
            Livingstone College
          </h1>
          <p style={{ 
            fontFamily: "'Inter', sans-serif", 
            fontWeight: '600', 
            fontSize: size === 'xl' ? '1.125rem' : '0.875rem', 
            letterSpacing: '0.15em', 
            margin: '4px 0 0 0', 
            color: '#A7CBE5', 
            textTransform: 'uppercase' 
          }}>
            Success Center
          </p>
        </div>
      </div>
    );
  }

  // Default: horizontal lockup
  return (
    <div className={`livingstone-logo-horizontal ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
      <Emblem />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ 
          fontFamily: "'Outfit', sans-serif", 
          fontWeight: '800', 
          fontSize: size === 'lg' ? '1.5rem' : '1.15rem', 
          letterSpacing: '0.03em', 
          lineHeight: '1.1',
          color: '#000000',
          textTransform: 'uppercase'
        }}>
          Livingstone College
        </span>
        <span style={{ 
          fontFamily: "'Inter', sans-serif", 
          fontWeight: '600', 
          fontSize: size === 'lg' ? '0.875rem' : '0.75rem', 
          letterSpacing: '0.1em', 
          lineHeight: '1.2',
          marginTop: '2px',
          color: '#333333', 
          textTransform: 'uppercase' 
        }}>
          Success Center
        </span>
      </div>
    </div>
  );
}
