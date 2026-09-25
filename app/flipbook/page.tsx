import fs from "node:fs";
import path from "node:path";
import Flipbook from "@/components/Flipbook";
import { FLIPBOOK_INTRO } from "@/lib/marketing";

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
      <h1 className="mb-2 text-2xl font-semibold text-ink">Catalogue photo</h1>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-soft">{FLIPBOOK_INTRO}</p>
      {pages.length === 0 ? (
        <p className="text-sm text-ink-faint">Aucune page pour le moment.</p>
      ) : (
        <Flipbook pages={pages} />
      )}
    </div>
  );
}
