import { PortalMarble } from './PortalMarble';
import { sampledPosition } from '../utils/terrain';
import { useWorldStore, type MarblePortal } from '../store/worldStore';

const portals: MarblePortal[] = [
  { id: 'dream', title: 'Dream Marble', description: 'A chamber for experiments, art pieces, and strange little worlds.' },
  { id: 'system', title: 'System Marble', description: 'Product systems, UX studies, and interfaces that became rituals.' },
  { id: 'ai', title: 'AI Marble', description: 'Tools, workflows, agents, and machines that learned to listen.' },
  { id: 'archive', title: 'Archive Marble', description: 'Old work, brand fragments, graphics, research, and buried signals.' },
  { id: 'contact', title: 'Contact Marble', description: 'A quiet place to send a note through the garden.' },
];

export function MarbleSystem() {
  const seed = useWorldStore((state) => state.marbleSeed);
  return (
    <group>
      {portals.map((portal, index) => (
        <PortalMarble key={`${portal.id}-${seed}`} portal={portal} position={sampledPosition(seed, index)} index={index} />
      ))}
    </group>
  );
}
