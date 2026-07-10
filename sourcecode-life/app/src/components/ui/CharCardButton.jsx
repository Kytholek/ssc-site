import React from 'react';
import { useAppDispatch } from '../../context/AppContext';

export default function CharCardButton({ children, onClick, className = '', compact = false }) {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    dispatch({ type: 'SET_TAB', payload: 'config' });
    window.location.hash = '#blueprint';
    if (onClick) onClick();
  };

  return (
    <button
      type="button"
      className={`char-card-open-btn${compact ? ' char-card-action-btn' : ''} ${className}`.trim()}
      onClick={handleClick}
    >
      {!compact && <span className="char-card-open-btn-icon">◇</span>}
      {children}
    </button>
  );
}

