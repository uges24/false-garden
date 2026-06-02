import { HUD } from './components/HUD';
import { Experience } from './components/Experience';
import { useWorldStore } from './store/worldStore';

export default function App() {
  const activePortal = useWorldStore((state) => state.activePortal);
  const closePortal = useWorldStore((state) => state.closePortal);

  return (
    <main className="app-shell">
      <Experience />
      <HUD />
      {activePortal ? (
        <div className="portal-panel" role="dialog" aria-modal="true" aria-label={activePortal.title}>
          <button className="icon-button portal-close" onClick={closePortal} aria-label="Close portal">
            x
          </button>
          <p className="portal-kicker">Portal marble awakened</p>
          <h2>{activePortal.title}</h2>
          <p>{activePortal.description}</p>
          <button className="portal-action">Step closer</button>
        </div>
      ) : null}
    </main>
  );
}
