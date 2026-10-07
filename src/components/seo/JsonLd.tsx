/** Données structurées schema.org (JSON-LD). Le « < » est échappé : impossible de fermer la balise <script> depuis une donnée produit. */
export function JsonLd({ data }: { data: object | object[] }) {
  const graph = Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : { "@context": "https://schema.org", ...data };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />;
}
