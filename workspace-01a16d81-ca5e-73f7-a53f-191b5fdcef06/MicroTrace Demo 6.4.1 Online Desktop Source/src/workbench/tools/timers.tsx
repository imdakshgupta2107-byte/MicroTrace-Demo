import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import type { TimerSpec } from "@/lib/types";
import { fmtNum } from "@/lib/format";

let nextId = 1;
function fmtClock(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function TimersTool() {
  const [label, setLabel] = useState("Incubation");
  const [minutes, setMinutes] = useState(10);
  const [timers, setTimers] = useState<TimerSpec[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const announced = useRef(new Set<number>());

  const enableSound = useCallback(() => {
    try {
      const Audio = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      audioRef.current ??= new Audio();
      if (audioRef.current.state === "suspended") void audioRef.current.resume().catch(() => undefined);
    } catch { /* Audio unavailable; visual alarm still works. */ }
  }, []);
  const beep = useCallback(() => {
    enableSound();
    try {
      const context = audioRef.current;
      if (context) {
        [0, 0.18, 0.36].forEach((delay) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.connect(gain); gain.connect(context.destination);
          oscillator.frequency.value = 880;
          gain.gain.setValueAtTime(0.15, context.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delay + 0.16);
          oscillator.start(context.currentTime + delay);
          oscillator.stop(context.currentTime + delay + 0.16);
        });
      }
      navigator.vibrate?.([200, 80, 200]);
    } catch { /* Device blocked audio/vibration; keep the alarm visible. */ }
  }, [enableSound]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTimers((current) => {
        let changed = false;
        const next = current.map((timer) => {
          if (!timer.on || timer.done) return timer;
          const left = Math.max(0, (timer.endAt - now) / 1000);
          if (left === timer.leftSec) return timer;
          changed = true;
          return left === 0 ? { ...timer, leftSec: 0, on: false, done: true } : { ...timer, leftSec: left };
        });
        // This updater is PURE: no force-setter, beep, vibration, or navigation.
        return changed ? next : current;
      });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    timers.forEach((timer) => {
      if (!timer.done) { announced.current.delete(timer.id); return; }
      if (announced.current.has(timer.id)) return;
      announced.current.add(timer.id);
      beep();
    });
  }, [timers, beep]);
  useEffect(() => () => {
    const context = audioRef.current;
    audioRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, []);

  function add() {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const duration = minutes * 60;
    const id = nextId++;
    setTimers((current) => [...current, { id, label: label.trim() || `Timer ${id}`, durSec: duration, leftSec: duration, on: false, done: false, endAt: 0 }]);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h3 className="font-extrabold text-[15px] text-ink">Lab timers</h3>
        <p className="text-xs text-slate-500">Keep this page open and the app in the foreground for alarms.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1"><span className="text-xs font-bold text-slate-600">Label</span>
          <Input value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} className="w-40" /></label>
        <label className="space-y-1"><span className="text-xs font-bold text-slate-600">Minutes</span>
          <Input type="number" min={0.01} step="any" value={minutes || ""} onChange={(event) => setMinutes(Number(event.target.value))} className="w-24" /></label>
        <Button variant="primary" onClick={add}><Plus size={14} /> Add</Button>
      </div>
      {timers.length === 0 && <p className="text-sm text-slate-400">No timers yet — add one above.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {timers.map((timer) => (
          <div key={timer.id} className={`rounded-2xl border p-4 space-y-2 transition ${timer.done ? "border-red-300 bg-red-50 animate-pulse" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm text-ink break-words">{timer.label}</b>
              {timer.done ? <Badge tone="red">done!</Badge> : timer.on ? <Badge tone="green">running</Badge> : <Badge tone="gray">paused</Badge>}
            </div>
            <div className="text-2xl font-mono font-extrabold text-ink tabular-nums">{fmtClock(timer.leftSec)}</div>
            <div className="text-xs text-slate-400">of {fmtNum(timer.durSec / 60)} min</div>
            <div className="flex flex-wrap gap-1.5">
              {!timer.on ? <Button size="sm" variant="green" disabled={timer.leftSec <= 0} onClick={() => {
                enableSound();
                setTimers((current) => current.map((item) => item.id === timer.id ? { ...item, on: true, done: false, endAt: Date.now() + item.leftSec * 1000 } : item));
              }}><Play size={12} /> {timer.leftSec === timer.durSec ? "Start" : "Resume"}</Button>
                : <Button size="sm" onClick={() => setTimers((current) => current.map((item) => item.id === timer.id ? { ...item, on: false } : item))}><Square size={12} /> Pause</Button>}
              <Button size="sm" variant="outline" aria-label="Reset timer" onClick={() => setTimers((current) => current.map((item) => item.id === timer.id ? { ...item, on: false, done: false, leftSec: item.durSec } : item))}><RotateCcw size={12} /></Button>
              <Button size="sm" variant="ghost" aria-label="Delete timer" onClick={() => setTimers((current) => current.filter((item) => item.id !== timer.id))}><Trash2 size={12} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
