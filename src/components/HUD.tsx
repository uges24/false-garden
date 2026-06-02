import { useWorldStore } from '../store/worldStore';

export function HUD() {
  const mode = useWorldStore((state) => state.mode);
  const performanceMode = useWorldStore((state) => state.performanceMode);
  const regenerateMarbles = useWorldStore((state) => state.regenerateMarbles);
  const togglePerformanceMode = useWorldStore((state) => state.togglePerformanceMode);

  return (
    <section className="hud" aria-label="False Garden controls">
      <div>
        <p className="eyebrow">living prototype</p>
        <h1>False Garden</h1>
        <p className="hud-copy">Click the sun to shift the world. Find marbles to open portals.</p>
      </div>
      <div className="hud-actions">
        <button onClick={regenerateMarbles}>Regenerate Marbles</button>
        <button onClick={togglePerformanceMode}>{performanceMode ? 'Performance On' : 'Performance Mode'}</button>
      </div>
      <div className="mode-pill">{mode}</div>
    </section>
  );
}
