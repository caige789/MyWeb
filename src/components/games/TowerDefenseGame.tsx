'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import GameControlsHelp, { type GameControlsInfo } from './GameControlsHelp';

const GW = 800, GH = 480;
const COLS = 16, ROWS = 10;
const CW = GW / COLS, CH = GH / ROWS;
const GAME_NAME = 'tower-defense';

const TOWER_DEFS: Record<string, { name: string; emoji: string; cost: number; range: number; damage: number; fireRate: number; color: string; splash: boolean; slow: boolean }[]> = {
  arrow: [
    { name: '箭塔 1', emoji: '\u{1F3F9}', cost: 50, range: 3, damage: 8, fireRate: 30, color: '#22c55e', splash: false, slow: false },
    { name: '箭塔 2', emoji: '\u{1F3F9}', cost: 80, range: 3.5, damage: 14, fireRate: 25, color: '#16a34a', splash: false, slow: false },
    { name: '箭塔 3', emoji: '\u{1F3F9}', cost: 120, range: 4, damage: 22, fireRate: 20, color: '#15803d', splash: false, slow: false },
  ],
  cannon: [
    { name: '炮塔 1', emoji: '\u{1F4A3}', cost: 80, range: 2.5, damage: 20, fireRate: 50, color: '#ef4444', splash: true, slow: false },
    { name: '炮塔 2', emoji: '\u{1F4A3}', cost: 120, range: 3, damage: 35, fireRate: 45, color: '#dc2626', splash: true, slow: false },
    { name: '炮塔 3', emoji: '\u{1F4A3}', cost: 180, range: 3.5, damage: 55, fireRate: 40, color: '#b91c1c', splash: true, slow: false },
  ],
  ice: [
    { name: '冰塔 1', emoji: '\u2744\uFE0F', cost: 60, range: 2.5, damage: 5, fireRate: 40, color: '#38bdf8', splash: false, slow: true },
    { name: '冰塔 2', emoji: '\u2744\uFE0F', cost: 100, range: 3, damage: 8, fireRate: 35, color: '#0ea5e9', splash: false, slow: true },
    { name: '冰塔 3', emoji: '\u2744\uFE0F', cost: 150, range: 3.5, damage: 12, fireRate: 30, color: '#0284c7', splash: false, slow: true },
  ],
  sniper: [
    { name: '狙击塔 1', emoji: '\u{1F3AF}', cost: 100, range: 5, damage: 40, fireRate: 80, color: '#a855f7', splash: false, slow: false },
    { name: '狙击塔 2', emoji: '\u{1F3AF}', cost: 150, range: 6, damage: 70, fireRate: 70, color: '#9333ea', splash: false, slow: false },
    { name: '狙击塔 3', emoji: '\u{1F3AF}', cost: 220, range: 7, damage: 110, fireRate: 60, color: '#7c3aed', splash: false, slow: false },
  ],
  tesla: [
    { name: '电塔 1', emoji: '\u26A1', cost: 120, range: 2, damage: 15, fireRate: 15, color: '#eab308', splash: false, slow: false },
    { name: '电塔 2', emoji: '\u26A1', cost: 180, range: 2.5, damage: 25, fireRate: 12, color: '#ca8a04', splash: false, slow: false },
    { name: '电塔 3', emoji: '\u26A1', cost: 260, range: 3, damage: 40, fireRate: 10, color: '#a16207', splash: false, slow: false },
  ],
};

const TOWER_KEYS = Object.keys(TOWER_DEFS);

interface MonsterDef { emoji: string; hp: number; speed: number; reward: number; isBoss: boolean }
const MONSTER_POOL: MonsterDef[] = [
  { emoji: '\u{1F47A}', hp: 30, speed: 1.2, reward: 5, isBoss: false },
  { emoji: '\u{1F47A}', hp: 45, speed: 1.0, reward: 7, isBoss: false },
  { emoji: '\u{1F9DF}', hp: 70, speed: 0.9, reward: 10, isBoss: false },
  { emoji: '\u{1F9DF}', hp: 100, speed: 0.8, reward: 12, isBoss: false },
  { emoji: '\u{1F479}', hp: 150, speed: 0.7, reward: 15, isBoss: false },
  { emoji: '\u{1F47A}', hp: 200, speed: 1.1, reward: 18, isBoss: false },
  { emoji: '\u{1F9DF}', hp: 280, speed: 0.9, reward: 20, isBoss: false },
  { emoji: '\u{1F479}', hp: 400, speed: 0.8, reward: 25, isBoss: false },
  { emoji: '\u{1F987}', hp: 120, speed: 2.0, reward: 15, isBoss: false },
  { emoji: '\u{1F987}', hp: 180, speed: 2.2, reward: 18, isBoss: false },
  { emoji: '\u{1F409}', hp: 800, speed: 0.5, reward: 80, isBoss: true },
  { emoji: '\u{1F479}', hp: 600, speed: 0.6, reward: 50, isBoss: true },
  { emoji: '\u{1F987}', hp: 300, speed: 2.5, reward: 30, isBoss: false },
  { emoji: '\u{1F47A}', hp: 500, speed: 1.3, reward: 30, isBoss: false },
  { emoji: '\u{1F409}', hp: 1500, speed: 0.4, reward: 150, isBoss: true },
];

const PATH_POINTS = [[-1,3],[3,3],[3,1],[7,1],[7,5],[4,5],[4,8],[10,8],[10,3],[13,3],[13,7],[16,7]];

interface Tower { col: number; row: number; type: string; level: number; cooldown: number; angle: number }
interface Monster { x: number; y: number; hp: number; maxHp: number; speed: number; reward: number; emoji: string; isBoss: boolean; pathProgress: number; slowTimer: number; dead: boolean }
interface Bullet { x: number; y: number; tx: number; ty: number; damage: number; speed: number; splash: boolean; slow: boolean; targetIdx: number; dead: boolean }
interface FloatText { x: number; y: number; text: string; color: string; life: number }

const tdControlsInfo: GameControlsInfo = {
  gameName: '保卫萝卜',
  desktop: [
    { action: '选择塔', keys: [], description: '点击底部面板选择塔类型' },
    { action: '放置塔', keys: [], description: '点击草地放置塔' },
    { action: '升级', keys: [], description: '点击已有的塔升级' },
    { action: '1-5 数字键', keys: ['Digit1','Digit2','Digit3','Digit4','Digit5'], description: '快速选择塔类型' },
    { action: '回车键', keys: ['Enter'], description: '开始下一波' },
    { action: '暂停', keys: ['Escape'], description: '暂停/继续' },
  ],
  mobile: [
    { action: '点击', keys: [], description: '点击放置/升级塔' },
  ],
  rules: ['放置塔来保护萝卜', '怪物沿路径前进', '击杀怪物获得金币', '升级塔增强威力', '后期波次有Boss怪物'],
  tips: ['冰塔减速敌人', '炮塔造成范围伤害', '电塔攻击速度极快', '狙击塔射程远', '混合搭配塔类型效果最佳'],
};

function buildPathCells(): Set<string> {
  const cells = new Set<string>();
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const [c1,r1] = PATH_POINTS[i], [c2,r2] = PATH_POINTS[i+1];
    if (c1===c2) { for (let r=Math.min(r1,r2); r<=Math.max(r1,r2); r++) cells.add(`${c1},${r}`); }
    else { for (let c=Math.min(c1,c2); c<=Math.max(c1,c2); c++) cells.add(`${c},${r1}`); }
  }
  return cells;
}
const PATH_CELLS = buildPathCells();

function getPathPixelLength(): number {
  let t=0;
  for (let i=0;i<PATH_POINTS.length-1;i++){
    const dx=(PATH_POINTS[i+1][0]-PATH_POINTS[i][0])*CW, dy=(PATH_POINTS[i+1][1]-PATH_POINTS[i][1])*CH;
    t+=Math.sqrt(dx*dx+dy*dy);
  }
  return t;
}
const PATH_LEN = getPathPixelLength();

function getPosOnPath(progress: number): [number,number] {
  let rem=progress*PATH_LEN;
  for (let i=0;i<PATH_POINTS.length-1;i++){
    const x1=(PATH_POINTS[i][0]+0.5)*CW, y1=(PATH_POINTS[i][1]+0.5)*CH;
    const x2=(PATH_POINTS[i+1][0]+0.5)*CW, y2=(PATH_POINTS[i+1][1]+0.5)*CH;
    const seg=Math.sqrt((x2-x1)**2+(y2-y1)**2);
    if(rem<=seg){const t=seg>0?rem/seg:0;return[x1+(x2-x1)*t,y1+(y2-y1)*t];}
    rem-=seg;
  }
  const l=PATH_POINTS[PATH_POINTS.length-1];
  return[(l[0]+0.5)*CW,(l[1]+0.5)*CH];
}

interface Props { on返回: () => void; }
type Phase = 'idle'|'playing'|'over'|'won';

export default function TowerDefenseGame({on返回}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const containerRef=useRef<HTMLDivElement>(null);
  const scaleRef=useRef(1);
  const dprRef=useRef(Math.min(window.devicePixelRatio||1,2));
  const rafRef=useRef(0);
  const [phase,setPhase]=useState<Phase>('idle');
  const [gold,setGold]=useState(200);
  const [lives,setLives]=useState(20);
  const [wave,setWave]=useState(0);
  const [score,setScore]=useState(0);
  const [bestScore,setBestScore]=useState(0);
  const [selTower,setSelTower]=useState('arrow');
  const [paused,setPaused]=useState(false);
  const [waveActive,setWaveActive]=useState(false);

  const g=useRef({
    towers:[] as Tower[],monsters:[] as Monster[],bullets:[] as Bullet[],floats:[] as FloatText[],
    gold:200,lives:20,wave:0,score:0,phase:'idle' as Phase,paused:false,
    spawnQueue:[] as MonsterDef[],spawnTimer:0,waveActive:false,
    selectedTower:'arrow',hoveredCell:null as [number,number]|null,frame:0,
  }).current;

  const fetchBest=useCallback(async()=>{try{const r=await fetch('/api/games/scores');const d=await r.json();if(d.data){const e=d.data.find((s:{game:string;score:number})=>s.game===GAME_NAME);setBestScore(e?e.score:0);}}catch{}},[]);
  useEffect(()=>{fetchBest();},[fetchBest]);

  const submitScore=useCallback(async(s:number)=>{try{await fetch('/api/games/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:GAME_NAME,score:s})});}catch{}fetchBest();},[fetchBest]);

  const genWave=useCallback((wn:number):MonsterDef[]=>{
    const q:MonsterDef[]=[];const tier=Math.min(Math.floor(wn/3),MONSTER_POOL.length-3);const count=6+wn*2;
    for(let i=0;i<count;i++){
      if(wn>0&&wn%5===0&&i===count-1)q.push(MONSTER_POOL[Math.min(tier+10,MONSTER_POOL.length-1)]);
      else{const idx=tier+Math.floor(Math.random()*3);q.push(MONSTER_POOL[Math.min(idx,MONSTER_POOL.length-1)]);}
    }
    return q;
  },[]);

  const startWave=useCallback(()=>{if(g.waveActive||g.phase!=='playing')return;g.wave++;g.spawnQueue=genWave(g.wave);g.spawnTimer=0;g.waveActive=true;setWave(g.wave);setWaveActive(true);},[genWave]);

  const startGame=useCallback(()=>{
    g.towers=[];g.monsters=[];g.bullets=[];g.floats=[];g.gold=200;g.lives=20;g.wave=0;g.score=0;g.phase='playing';g.paused=false;g.spawnQueue=[];g.spawnTimer=0;g.waveActive=false;g.frame=0;
    setPhase('playing');setGold(200);setLives(20);setWave(0);setScore(0);setPaused(false);setWaveActive(false);
  },[]);

  const endGame=useCallback((won:boolean)=>{g.phase=won?'won':'over';setPhase(won?'won':'over');submitScore(g.score);},[submitScore]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;

    function resize(){if(!canvas)return;const dw=canvas.clientWidth;if(dw<=0)return;dprRef.current=Math.min(window.devicePixelRatio||1,2);scaleRef.current=dw/GW;canvas.width=dw*dprRef.current;canvas.height=(dw/GW*GH)*dprRef.current;}
    resize();
    const ro=new ResizeObserver(resize);if(containerRef.current)ro.observe(containerRef.current);
    const onVis=()=>{if(!document.hidden)resize();};document.addEventListener('visibilitychange',onVis);

    function loop(){if(!ctx)return;
      if(g.phase!=='playing')return;if(g.paused){rafRef.current=requestAnimationFrame(loop);return;}
      g.frame++;
      ctx.setTransform(dprRef.current*scaleRef.current,0,0,dprRef.current*scaleRef.current,0,0);

      if(g.waveActive&&g.spawnQueue.length>0){g.spawnTimer--;if(g.spawnTimer<=0){const d=g.spawnQueue.shift()!;const[sx,sy]=getPosOnPath(0);g.monsters.push({x:sx,y:sy,hp:d.hp,maxHp:d.hp,speed:d.speed,reward:d.reward,emoji:d.emoji,isBoss:d.isBoss,pathProgress:0,slowTimer:0,dead:false});g.spawnTimer=Math.max(10,30-Math.min(g.wave,10));}}

      if(g.waveActive&&g.spawnQueue.length===0&&g.monsters.every(m=>m.dead)){g.waveActive=false;setWaveActive(false);g.gold+=20+g.wave*5;setGold(g.gold);if(g.wave>=15){endGame(true);return;}}

      for(const m of g.monsters){if(m.dead)continue;let spd=m.speed;if(m.slowTimer>0){spd*=0.4;m.slowTimer--;}m.pathProgress+=spd/PATH_LEN;const[nx,ny]=getPosOnPath(m.pathProgress);m.x=nx;m.y=ny;if(m.pathProgress>=1){m.dead=true;g.lives--;setLives(g.lives);g.floats.push({x:GW-20,y:GH/2,text:'-1 生命',color:'#ef4444',life:40});if(g.lives<=0){endGame(false);return;}}}
      g.monsters=g.monsters.filter(m=>!m.dead);

      for(const t of g.towers){if(t.cooldown>0){t.cooldown--;continue;}const def=TOWER_DEFS[t.type][t.level];const tx=(t.col+0.5)*CW,ty=(t.row+0.5)*CH;const rng=def.range*CW;let best:Monster|null=null;let bestP=-1;for(const m of g.monsters){if(m.dead)continue;const dx=m.x-tx,dy=m.y-ty;if(dx*dx+dy*dy<rng*rng&&m.pathProgress>bestP){best=m;bestP=m.pathProgress;}}if(best){t.angle=Math.atan2(best.y-ty,best.x-tx);g.bullets.push({x:tx,y:ty,tx:best.x,ty:best.y,damage:def.damage,speed:6,splash:def.splash,slow:def.slow,targetIdx:g.monsters.indexOf(best),dead:false});t.cooldown=def.fireRate;}}

      for(const b of g.bullets){if(b.dead)continue;const dx=b.tx-b.x,dy=b.ty-b.y;const dist=Math.sqrt(dx*dx+dy*dy);if(dist<8){if(b.splash){const sr=CW*1.2;for(const m of g.monsters){if(m.dead)continue;const mdx=m.x-b.tx,mdy=m.y-b.ty;if(mdx*mdx+mdy*mdy<sr*sr){m.hp-=b.damage*0.6;if(b.slow)m.slowTimer=60;}}}else{const tgt=g.monsters[b.targetIdx];if(tgt&&!tgt.dead){tgt.hp-=b.damage;if(b.slow)tgt.slowTimer=90;}}b.dead=true;}else{b.x+=(dx/dist)*b.speed;b.y+=(dy/dist)*b.speed;}}

      for(const m of g.monsters){if(!m.dead&&m.hp<=0){m.dead=true;g.gold+=m.reward;g.score+=m.reward;setGold(g.gold);setScore(g.score);g.floats.push({x:m.x,y:m.y-15,text:`+${m.reward}`,color:'#fbbf24',life:35});}}
      g.monsters=g.monsters.filter(m=>!m.dead);g.bullets=g.bullets.filter(b=>!b.dead);
      for(const f of g.floats){f.y-=0.8;f.life--;}g.floats=g.floats.filter(f=>f.life>0);

      // DRAW
      ctx.fillStyle='#4a7c3f';ctx.fillRect(0,0,GW,GH);
      ctx.strokeStyle='rgba(0,0,0,0.1)';ctx.lineWidth=0.5;
      for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*CW,0);ctx.lineTo(c*CW,GH);ctx.stroke();}
      for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CH);ctx.lineTo(GW,r*CH);ctx.stroke();}

      ctx.fillStyle='#c4a46c';
      for(const cell of PATH_CELLS){const[c,r]=cell.split(',').map(Number);if(c>=0&&c<COLS&&r>=0&&r<ROWS)ctx.fillRect(c*CW,r*CH,CW,CH);}

      const[cx2,cy2]=getPosOnPath(0.97);ctx.font='28px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u{1F955}',cx2,cy2);

      if(g.hoveredCell){const[hc,hr]=g.hoveredCell;if(!PATH_CELLS.has(`${hc},${hr}`)){const ex=g.towers.find(t=>t.col===hc&&t.row===hr);if(!ex){const td=TOWER_DEFS[g.selectedTower][0];ctx.fillStyle=td.color+'40';ctx.fillRect(hc*CW,hr*CH,CW,CH);}}}

      for(const t of g.towers){const def=TOWER_DEFS[t.type][t.level];const tx=(t.col+0.5)*CW,ty=(t.row+0.5)*CH;ctx.fillStyle=def.color+'80';ctx.fillRect(t.col*CW+2,t.row*CH+2,CW-4,CH-4);ctx.strokeStyle=def.color;ctx.lineWidth=2;ctx.strokeRect(t.col*CW+2,t.row*CH+2,CW-4,CH-4);ctx.font='20px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(def.emoji,tx,ty-2);ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText(`\u7b49\u7ea7${t.level+1}`,tx,ty+16);}

      for(const m of g.monsters){ctx.font=m.isBoss?'24px serif':'18px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(m.emoji,m.x,m.y);const bw=m.isBoss?36:24;const bx=m.x-bw/2;const by=m.y-(m.isBoss?18:14);ctx.fillStyle='#333';ctx.fillRect(bx-1,by-1,bw+2,5);const pct=m.hp/m.maxHp;ctx.fillStyle=pct>0.5?'#22c55e':pct>0.25?'#eab308':'#ef4444';ctx.fillRect(bx,by,bw*pct,3);if(m.slowTimer>0){ctx.strokeStyle='#38bdf8';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,3);}}

      for(const b of g.bullets){ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();}
      for(const f of g.floats){ctx.globalAlpha=f.life/35;ctx.fillStyle=f.color;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;

      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,GH-44,GW,44);
      ctx.fillStyle='#fbbf24';ctx.font='bold 14px sans-serif';ctx.textAlign='left';ctx.fillText(`金币: ${g.gold}`,10,GH-20);
      ctx.fillStyle='#ef4444';ctx.fillText(`生命: ${g.lives}`,160,GH-20);
      ctx.fillStyle='#fff';ctx.fillText(`波次: ${g.wave}/15`,310,GH-20);
      ctx.fillStyle='#a855f7';ctx.fillText(`得分: ${g.score}`,480,GH-20);
      if(!g.waveActive&&g.wave<15){ctx.fillStyle='#22c55e';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('[ 按回车或点击此处开始下一波 ]',GW/2,GH-5);}
      if(g.paused){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,GW,GH);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('已暂停',GW/2,GH/2);}

      rafRef.current=requestAnimationFrame(loop);
    }
    rafRef.current=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(rafRef.current);ro.disconnect();document.removeEventListener('visibilitychange',onVis);};
  },[phase,endGame]);

  const handleTouch=useCallback((e:React.TouchEvent<HTMLCanvasElement>)=>{
    if(g.phase!=='playing'||g.paused)return;const canvas=canvasRef.current;if(!canvas)return;const touch=e.touches[0];if(!touch)return;const rect=canvas.getBoundingClientRect();const sx=GW/rect.width,sy=GH/rect.height;const mx=(touch.clientX-rect.left)*sx,my=(touch.clientY-rect.top)*sy;
    e.preventDefault();
    if(!g.waveActive&&my>GH-44&&g.wave<15){startWave();return;}
    const col=Math.floor(mx/CW),row=Math.floor(my/CH);if(col<0||col>=COLS||row<0||row>=ROWS)return;
    const ex=g.towers.find(t=>t.col===col&&t.row===row);
    if(ex){const defs=TOWER_DEFS[ex.type];if(ex.level<defs.length-1){const nc=defs[ex.level+1].cost;if(g.gold>=nc){g.gold-=nc;ex.level++;setGold(g.gold);}}return;}
    if(PATH_CELLS.has(`${col},${row}`))return;const td=TOWER_DEFS[g.selectedTower][0];if(g.gold<td.cost)return;g.gold-=td.cost;g.towers.push({col,row,type:g.selectedTower,level:0,cooldown:0,angle:0});setGold(g.gold);
  },[startWave]);

  const handleClick=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    if(g.phase!=='playing'||g.paused)return;const canvas=canvasRef.current;if(!canvas)return;const rect=canvas.getBoundingClientRect();const sx=GW/rect.width,sy=GH/rect.height;const mx=(e.clientX-rect.left)*sx,my=(e.clientY-rect.top)*sy;
    if(!g.waveActive&&my>GH-44&&g.wave<15){startWave();return;}
    const col=Math.floor(mx/CW),row=Math.floor(my/CH);if(col<0||col>=COLS||row<0||row>=ROWS)return;
    const ex=g.towers.find(t=>t.col===col&&t.row===row);
    if(ex){const defs=TOWER_DEFS[ex.type];if(ex.level<defs.length-1){const nc=defs[ex.level+1].cost;if(g.gold>=nc){g.gold-=nc;ex.level++;setGold(g.gold);}}return;}
    if(PATH_CELLS.has(`${col},${row}`))return;const td=TOWER_DEFS[g.selectedTower][0];if(g.gold<td.cost)return;g.gold-=td.cost;g.towers.push({col,row,type:g.selectedTower,level:0,cooldown:0,angle:0});setGold(g.gold);
  },[startWave]);

  const handleMove=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current;if(!canvas)return;const rect=canvas.getBoundingClientRect();const mx=(e.clientX-rect.left)*(GW/rect.width),my=(e.clientY-rect.top)*(GH/rect.height);
    const col=Math.floor(mx/CW),row=Math.floor(my/CH);g.hoveredCell=(col>=0&&col<COLS&&row>=0&&row<ROWS&&my<GH-44)?[col,row]:null;
  },[]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.code==='Escape'&&g.phase==='playing'){e.preventDefault();g.paused=!g.paused;setPaused(g.paused);}if(e.code==='Enter'&&g.phase==='playing'&&!g.waveActive){e.preventDefault();startWave();}
    if(e.code==='Digit1'){g.selectedTower='arrow';setSelTower('arrow');}if(e.code==='Digit2'){g.selectedTower='cannon';setSelTower('cannon');}if(e.code==='Digit3'){g.selectedTower='ice';setSelTower('ice');}if(e.code==='Digit4'){g.selectedTower='sniper';setSelTower('sniper');}if(e.code==='Digit5'){g.selectedTower='tesla';setSelTower('tesla');}};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[startWave]);

  // GamePlayer pause/resume events
  useEffect(()=>{
    const onPause=()=>{g.paused=true;setPaused(true);};
    const onResume=()=>{g.paused=false;setPaused(false);};
    window.addEventListener('game-pause',onPause);
    window.addEventListener('game-resume',onResume);
    return()=>{window.removeEventListener('game-pause',onPause);window.removeEventListener('game-resume',onResume);};
  },[]);

  if(phase==='idle'){
    return(
      <div className='flex flex-col items-center gap-4 px-2 py-2 w-full max-w-2xl mx-auto'>
        <div className='flex items-center gap-2 self-start w-full'><Button variant='ghost' size='icon' onClick={on返回}><ArrowLeft className='h-5 w-5'/></Button><h2 className='text-xl font-bold'>{'\u{1F955}'} 保卫萝卜</h2><GameControlsHelp info={tdControlsInfo} variant='button' className='ml-auto'/></div>
        <div className='w-full bg-card border rounded-xl p-4 space-y-4'>
          <p className='text-sm text-muted-foreground text-center'>15波次，5种塔，每种3级升级。保护萝卜！</p>
          <div className='grid grid-cols-5 gap-2'>{TOWER_KEYS.map(key=>(
            <button key={key} className='flex flex-col items-center gap-1 p-2 rounded-lg border bg-muted hover:bg-accent transition text-xs' onClick={()=>{setSelTower(key);g.selectedTower=key;}}>
              <span className='text-xl'>{TOWER_DEFS[key][0].emoji}</span>
              <span>{TOWER_DEFS[key][0].name.split(' ')[0]}</span>
              <span className='text-muted-foreground'>${TOWER_DEFS[key][0].cost}</span>
            </button>))}</div>
          <div className='flex items-center justify-center gap-2 text-sm'><Trophy className='h-4 w-4 text-yellow-500'/><span>最高分: {bestScore}</span></div>
          <Button onClick={startGame} className='w-full' size='lg'>开始游戏</Button>
        </div>
      </div>);
  }

  if(phase==='over'||phase==='won'){
    return(
      <div className='flex flex-col items-center gap-4 px-2 py-2 w-full max-w-2xl mx-auto'>
        <div className='flex items-center gap-2 self-start w-full'><Button variant='ghost' size='icon' onClick={on返回}><ArrowLeft className='h-5 w-5'/></Button><h2 className='text-xl font-bold'>{phase==='won'?'胜利!':'游戏结束'}</h2></div>
        <div className='w-full bg-card border rounded-xl p-4 flex flex-col items-center gap-3'>
          <p className='text-5xl'>{phase==='won'?'\u{1F3C6}':'\u{1F622}'}</p>
          <p className='text-3xl font-bold'>{score}</p><p className='text-sm text-muted-foreground'>得分</p>
          <p className='text-sm'>波次: {wave}/15 | 最高分: {bestScore}</p>
          {score>bestScore&&score>0&&<p className='text-yellow-500 font-bold'>新纪录！</p>}
          <div className='flex gap-2 w-full mt-2'><Button variant='outline' className='flex-1' onClick={on返回}>返回</Button><Button className='flex-1' onClick={startGame}>重试</Button></div>
        </div>
      </div>);
  }

  return(
    <div className='flex flex-col items-center gap-2 px-2 py-2 w-full max-w-2xl mx-auto'>
      <div className='flex items-center gap-2 w-full px-1'>
        <Button variant='ghost' size='sm' onClick={on返回}><ArrowLeft className='h-4 w-4 mr-1'/>返回</Button>
        <h2 className='text-base font-bold flex-1 text-center'>{'\u{1F955}'} 保卫萝卜</h2>
        <GameControlsHelp info={tdControlsInfo} variant='button'/>
      </div>
      <div ref={containerRef}><canvas ref={canvasRef} style={{width:'100%',maxWidth:GW,aspectRatio:`${GW}/${GH}`,touchAction:'none'}} className='rounded-lg border cursor-crosshair' onClick={handleClick} onTouchStart={handleTouch} onMouseMove={handleMove}/></div>
      <div className='flex gap-1.5 flex-wrap justify-center'>
        {TOWER_KEYS.map(key=>(<button key={key} className='flex items-center gap-1 px-3 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-xs font-medium transition min-h-[44px] sm:min-h-0' style={{backgroundColor:selTower===key?TOWER_DEFS[key][0].color+'30':'transparent',border:`1px solid ${selTower===key?TOWER_DEFS[key][0].color:'#444'}`}} onClick={()=>{setSelTower(key);g.selectedTower=key;}}>{TOWER_DEFS[key][0].emoji} ${TOWER_DEFS[key][0].cost}</button>))}
        {!waveActive&&<button className='px-4 py-2 sm:py-1.5 rounded-lg text-xs sm:text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 transition min-h-[44px] sm:min-h-0' onClick={startWave}>开始波次</button>}
      </div>
    </div>
  );
}