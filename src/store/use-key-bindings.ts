'use client';

import { create } from 'zustand';

export type GameAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'action1' | 'action2' | 'action3'
  | 'pause' | 'confirm' | 'cancel';

export interface ActionInfo {
  label: string;
  description: string;
}

export const ACTION_META: Record<GameAction, ActionInfo> = {
  up:      { label: '上',   description: '向上移动 / 跳跃' },
  down:    { label: '下',   description: '向下移动 / 加速' },
  left:    { label: '左',   description: '向左移动' },
  right:   { label: '右',   description: '向右移动' },
  action1: { label: '动作1', description: '主要操作（发射/攻击/飞翔）' },
  action2: { label: '动作2', description: '次要操作（跳跃/旋转）' },
  action3: { label: '动作3', description: '特殊操作（硬降）' },
  pause:   { label: '暂停', description: '暂停 / 继续游戏' },
  confirm: { label: '确认', description: '确认操作' },
  cancel:  { label: '取消', description: '取消操作' },
};

const DEFAULT_BINDINGS: Record<GameAction, string[]> = {
  up:      ['ArrowUp', 'KeyW'],
  down:    ['ArrowDown', 'KeyS'],
  left:    ['ArrowLeft', 'KeyA'],
  right:   ['ArrowRight', 'KeyD'],
  action1: ['Space'],
  action2: ['KeyJ', 'ArrowUp'],
  action3: ['Space'],
  pause:   ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space'],
  cancel:  ['Escape'],
};

function loadBindings(): Record<GameAction, string[]> {
  if (typeof window === 'undefined') return DEFAULT_BINDINGS;
  try {
    const saved = localStorage.getItem('key-bindings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_BINDINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_BINDINGS;
}

function saveBindings(bindings: Record<GameAction, string[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('key-bindings', JSON.stringify(bindings));
  } catch {}
}

interface KeyBindingsStore {
  bindings: Record<GameAction, string[]>;
  setBinding: (action: GameAction, codes: string[]) => void;
  resetBinding: (action: GameAction) => void;
  resetAll: () => void;
  matchesAction: (action: GameAction, event: KeyboardEvent) => boolean;
  getKeyLabel: (code: string) => string;
  getActionKeys: (action: GameAction) => string[];
}

const CODE_TO_LABEL: Record<string, string> = {
  'Space': 'Space',
  'Enter': 'Enter',
  'Escape': 'Esc',
  'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
  'Backspace': 'Back', 'Tab': 'Tab', 'ShiftLeft': 'L-Shift', 'ShiftRight': 'R-Shift',
  'ControlLeft': 'L-Ctrl', 'ControlRight': 'R-Ctrl',
  'AltLeft': 'L-Alt', 'AltRight': 'R-Alt',
  'CapsLock': 'Caps',
};

function codeToLabel(code: string): string {
  if (CODE_TO_LABEL[code]) return CODE_TO_LABEL[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  if (code.startsWith('F') && code.length <= 3) return code;
  return code;
}

export const useKeyBindings = create<KeyBindingsStore>((set, get) => ({
  bindings: loadBindings(),

  setBinding: (action, codes) => {
    set(state => {
      const next = { ...state.bindings, [action]: codes };
      saveBindings(next);
      return { bindings: next };
    });
  },

  resetBinding: (action) => {
    set(state => {
      const next = { ...state.bindings, [action]: DEFAULT_BINDINGS[action] };
      saveBindings(next);
      return { bindings: next };
    });
  },

  resetAll: () => {
    saveBindings(DEFAULT_BINDINGS);
    set({ bindings: { ...DEFAULT_BINDINGS } });
  },

  matchesAction: (action, event) => {
    const codes = get().bindings[action];
    return codes.includes(event.code);
  },

  getKeyLabel: (code) => codeToLabel(code),

  getActionKeys: (action) => get().bindings[action],
}));
