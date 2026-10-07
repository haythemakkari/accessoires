import { describe, expect, it } from "vitest";
import { isLocalMedia, mediaSrcSet, mediaUrl } from "@/lib/media";

describe("images adaptatives", () => {
  it("transforme les fichiers téléversés en URL redimensionnée", () => {
    expect(mediaUrl("/uploads/abc-123.webp", 480)).toBe("/media/abc-123.webp?w=480");
    expect(mediaUrl("/uploads/abc-123.webp")).toBe("/media/abc-123.webp");
  });
  it("ne touche pas aux liens externes ni aux chemins inattendus", () => {
    for (const s of ["https://exemple.com/a.jpg", "/autre/chemin.png", "/uploads/../secret.png", "/uploads/a/b.png"]) {
      expect(mediaUrl(s, 480)).toBe(s);
      expect(mediaSrcSet(s)).toBeUndefined();
      expect(isLocalMedia(s)).toBe(false);
    }
  });
  it("construit un srcset croissant", () => {
    const s = mediaSrcSet("/uploads/x.jpg")!;
    expect(s).toContain("/media/x.jpg?w=320 320w");
    expect(s).toContain("/media/x.jpg?w=1200 1200w");
  });
});
