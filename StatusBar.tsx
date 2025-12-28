
import React from 'react';
import { MAX_STATS } from '../constants';
import { FontSize, Language } from '../types';

interface StatusBarProps {
  health: number;
  hunger: number;
  fontSize?: FontSize;
  lang?: Language;
}

const StatusBar: React.FC<StatusBarProps> = ({ health, hunger, fontSize = 'medium', lang = 'en' }) => {
  const isCN = lang === 'cn';
  const iconSize = fontSize === 'large' ? 'text-4xl' : fontSize === 'small' ? 'text-2xl' : 'text-3xl';
  const labelSize = fontSize === 'large' ? (isCN ? 'text-[16px]' : 'text-[14px]') : fontSize === 'small' ? (isCN ? 'text-[12px]' : 'text-[10px]') : (isCN ? 'text-[14px]' : 'text-[12px]');

  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < MAX_STATS; i++) {
      hearts.push(
        <span key={i} className={`${iconSize} leading-none ${i < health ? 'animate-pulse' : 'grayscale opacity-20'}`}>
          ❤️
        </span>
      );
    }
    return hearts;
  };

  const renderHunger = () => {
    const legs = [];
    for (let i = 0; i < MAX_STATS; i++) {
      legs.push(
        <span key={i} className={`${iconSize} leading-none ${i < hunger ? '' : 'grayscale opacity-20'}`}>
          🍗
        </span>
      );
    }
    return legs;
  };

  return (
    <div className="p-6 bg-indigo-900/50 backdrop-blur-lg pixel-border mb-4 space-y-6">
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <span className={`pixel-font ${labelSize} text-white font-bold`}>{isCN ? '生命 (HP)' : 'HEALTH (HP)'}</span>
          <div className="h-4 w-40 bg-gray-900 pixel-border border-2 border-white overflow-hidden shadow-inner">
            <div className="bg-red-500 h-full transition-all duration-500 ease-out" style={{ width: `${(health / MAX_STATS) * 100}%` }}></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {renderHearts()}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <span className={`pixel-font ${labelSize} text-white font-bold`}>{isCN ? '饱食 (F)' : 'ENERGY (F)'}</span>
          <div className="h-4 w-40 bg-gray-900 pixel-border border-2 border-white overflow-hidden shadow-inner">
            <div className="bg-orange-500 h-full transition-all duration-500 ease-out" style={{ width: `${(hunger / MAX_STATS) * 100}%` }}></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {renderHunger()}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
