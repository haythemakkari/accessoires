import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://www.exemple.tn";
process.env.NEXT_PUBLIC_SITE_NAME = "Accessoires Plus";
const { absoluteUrl, breadcrumbJsonLd, organizationJsonLd } = await import("@/lib/seo");
const { asset } = await import("@/lib/assets");

describe("SEO : URLs et données structurées", () => {
  it("construit des URLs absolues à partir de l'URL publique du site", () => {
    expect(absoluteUrl("/")).toBe("https://www.exemple.tn/");
    expect(absoluteUrl("/products?gender=femme&category=bague")).toBe("https://www.exemple.tn/products?gender=femme&category=bague");
  });
  it("fil d'Ariane : positions 1..n et URLs absolues", () => {
    const b = breadcrumbJsonLd([{ name: "Accueil", path: "/" }, { name: "Boutique", path: "/products" }, { name: "Bague", path: "/products?category=bague" }]);
    expect(b["@type"]).toBe("BreadcrumbList");
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(b.itemListElement[2].item).toBe("https://www.exemple.tn/products?category=bague");
  });
  it("Organization + WebSite : recherche interne, et coordonnées seulement si renseignées", () => {
    const empty = organizationJsonLd({ contactEmail: "", contactPhone: "", contactAddress: "" });
    expect(empty.map((x) => x["@type"])).toEqual(["Organization", "WebSite"]);
    expect(empty[0]).not.toHaveProperty("contactPoint");
    expect(empty[0]).not.toHaveProperty("address");
    const site = empty[1] as { potentialAction: { target: { urlTemplate: string } } };
    expect(site.potentialAction.target.urlTemplate).toBe("https://www.exemple.tn/products?q={search_term_string}");
    const full = organizationJsonLd({ contactEmail: "a@b.tn", contactPhone: "+21671234567", contactAddress: "12 rue X, Tunis" }) as Array<Record<string, unknown>>;
    expect(full[0].contactPoint).toMatchObject({ telephone: "+21671234567", email: "a@b.tn", areaServed: "TN" });
    expect(full[0].address).toMatchObject({ addressCountry: "TN" });
  });
  it("fichiers statiques versionnés (cache 1 an) : ?v=N", () => {
    expect(asset("/logo.webp")).toMatch(/^\/logo\.webp\?v=\d+$/);
  });
});
