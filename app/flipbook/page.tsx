import fs from "node:fs";
import path from "node:path";
import Flipbook from "@/components/Flipbook";

function getPages(): string[] {
  const dir = path.join(process.cwd(), "public", "catalogue-flipbook");
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  } catch {
    return [];
  }
  files.sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return files.map((f) => `/catalogue-flipbook/${f}`);
}

export default function FlipbookPage() {
  const pages = getPages();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-medium text-ink">Catalogue photo</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Feuilletez le catalogue papier. Faites glisser un coin de page pour tourner.
      </p>
      {pages.length === 0 ? (
        <p className="text-sm text-ink-faint">Aucune page pour le moment.</p>
      ) : (
        <Flipbook pages={pages} />
      )}
    </div>
  );
}
