import fs from "node:fs";
import path from "node:path";
import Flipbook from "@/components/Flipbook";
import { FLIPBOOK_INTRO, FLIPBOOK_TITLE } from "@/lib/marketing";
import { COMPANY } from "@/lib/company";

export const metadata = {
  title: "Catalogue papier — Société Tunisienne de Décoration",
  description:
    "Le catalogue imprimé, page après page : pots, bacs, vasques, colonnes, dallages en pierre reconstituée.",
};

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
      {/* Même entrée de page que l'accueil et Prévisualiser : surtitre en
          terracotta, titre en Cormorant, une phrase, puis le contenu. */}
      <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-brand-600">
        Atelier de {COMPANY.city}
      </span>
      <h1 className="text-3xl font-normal text-ink sm:text-4xl">{FLIPBOOK_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{FLIPBOOK_INTRO}</p>
      {pages.length > 0 && (
        <p className="mt-2 text-xs text-ink-faint">
          {pages.length} pages
        </p>
      )}

      <div className="mt-10">
        {pages.length === 0 ? (
          <p className="text-sm text-ink-faint">Aucune page pour le moment.</p>
        ) : (
          <Flipbook pages={pages} />
        )}
      </div>
    </div>
  );
}
