/**
 * 工具箱页面 - 集成8个工具
 */
'use client';

import TodoList from './TodoList';
import Diary from './Diary';
import WeatherQuery from './WeatherQuery';
import Pomodoro from './Pomodoro';
import RandomQuote from './RandomQuote';
import PasswordGenerator from './PasswordGenerator';
import ColorPicker from './ColorPicker';
import Countdown from './Countdown';
import { Wrench } from 'lucide-react';

export default function Toolbox() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Wrench className="h-6 w-6 text-primary" /> 工具箱
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - tools that benefit from full width or are primary */}
        <div className="space-y-6">
          <TodoList />
          <Pomodoro />
          <PasswordGenerator />
          <Countdown />
        </div>
        {/* Right column */}
        <div className="space-y-6">
          <Diary />
          <ColorPicker />
          <WeatherQuery />
          <RandomQuote />
        </div>
      </div>
    </div>
  );
}
