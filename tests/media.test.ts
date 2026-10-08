import { describe, expect, it } from "vitest";
import { isLocalMedia, mediaSrcSet, mediaUrl } from "@/lib/media";
import { detectVideoExt } from "@/lib/video";
import { VIDEO_BLOB_PATH } from "@/lib/storage";

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

describe("vidéo d'accueil : format réel", () => {
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.alloc(4)]);
  const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  it("reconnaît MP4 et WebM par leur signature", () => {
    expect(detectVideoExt(mp4)).toBe("mp4");
    expect(detectVideoExt(webm)).toBe("webm");
  });
  it("refuse un autre fichier renommé en .mp4", () => {
    expect(detectVideoExt(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectVideoExt(Buffer.alloc(0))).toBeNull();
  });
  it("n'accepte comme chemin Blob qu'une vidéo dans uploads/videos", () => {
    expect(VIDEO_BLOB_PATH.test("uploads/videos/1791-ab12.mp4")).toBe(true);
    for (const p of ["uploads/videos/../x.mp4", "uploads/x.mp4", "uploads/videos/a.html", "uploads/videos/a/b.webm"]) expect(VIDEO_BLOB_PATH.test(p)).toBe(false);
  });
});
