import React from 'react';

const FloatingChart = ({ type, style }: { type: 'pie' | 'line' | 'scatter', style: React.CSSProperties }) => {
  return (
    <div className="absolute opacity-10 pointer-events-none select-none" style={style}>
      {type === 'pie' && (
        <svg width="100" height="100" viewBox="0 0 100 100" className="animate-float">
          <path d="M 50 50 L 50 10 A 40 40 0 0 1 90 50 Z" fill="currentColor" />
          <path d="M 50 50 L 90 50 A 40 40 0 1 1 50 10 Z" fill="currentColor" opacity="0.5" />
        </svg>
      )}
      {type === 'line' && (
        <svg width="120" height="60" viewBox="0 0 120 60" className="animate-float-slow">
          <path d="M 10 50 L 40 20 L 70 40 L 110 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {type === 'scatter' && (
        <svg width="80" height="80" viewBox="0 0 80 80" className="animate-pulse-subtle">
          <circle cx="20" cy="20" r="4" fill="currentColor" />
          <circle cx="40" cy="50" r="4" fill="currentColor" />
          <circle cx="60" cy="30" r="4" fill="currentColor" />
          <circle cx="30" cy="70" r="4" fill="currentColor" />
          <circle cx="50" cy="15" r="4" fill="currentColor" />
        </svg>
      )}
    </div>
  );
};

export default function Background() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-bg-main">
      {/* Soft Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse-subtle" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse-subtle" style={{ animationDelay: '-4s' }} />

      {/* Floating Elements */}
      <FloatingChart type="pie" style={{ top: '15%', left: '10%' }} />
      <FloatingChart type="line" style={{ top: '65%', left: '15%' }} />
      <FloatingChart type="scatter" style={{ top: '25%', right: '15%' }} />
      <FloatingChart type="pie" style={{ bottom: '15%', right: '10%', transform: 'scale(0.8)' }} />
      <FloatingChart type="line" style={{ top: '45%', right: '40%', transform: 'scale(1.2) rotate(15deg)' }} />
      <FloatingChart type="scatter" style={{ bottom: '40%', left: '40%' }} />
    </div>
  );
}
