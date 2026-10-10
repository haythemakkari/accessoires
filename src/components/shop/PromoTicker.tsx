/**
 * Bandeau d'annonces qui défile en continu de gauche à droite (boucle sans coupure).
 * Le texte réel est lu une seule fois par les lecteurs d'écran ; les copies animées sont masquées.
 * Mouvement réduit (préférence du système) ou survol : le défilement s'arrête.
 */
export function PromoTicker({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  // Un groupe = les messages répétés assez de fois pour dépasser la largeur d'un écran large ; le bandeau en contient deux (boucle à -50 %).
  const group = Array.from({ length: 3 }, () => messages).flat();
  const Group = () => (
    <ul className="flex shrink-0 items-center" aria-hidden="true">
      {group.map((m, i) => (
        <li key={i} className="flex shrink-0 items-center whitespace-nowrap">
          <span>{m}</span>
          <span className="mx-8 text-brass-light">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="promo-ticker group overflow-hidden bg-ink py-2 text-xs uppercase tracking-[0.2em] text-sand-200">
      <p className="sr-only">{messages.join(". ")}</p>
      <div className="promo-track flex w-max motion-reduce:hidden"><Group /><Group /></div>
      <p className="hidden text-center motion-reduce:block">{messages.join(" · ")}</p>
    </div>
  );
}
