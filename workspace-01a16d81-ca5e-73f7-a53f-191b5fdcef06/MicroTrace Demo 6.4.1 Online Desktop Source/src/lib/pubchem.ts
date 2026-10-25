// pubchem — live PubChem REST lookup (name → CID, MW, hazards).
// Network errors fail soft (return null); the app works fully offline.
export interface PubChemHit {
  cid: number;
  iupac: string;
  formula: string;
  mw: number | null;
  ghsCodes: string[];
}

export const pubchemOn = (): boolean => (import.meta.env.VITE_PUBCHEM_ENABLED ?? "false") !== "false";

export async function lookupPubChem(name: string): Promise<PubChemHit | null> {
  if (!pubchemOn()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const q = encodeURIComponent(name);
    const cidRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${q}/cids/JSON`,
      { signal: ctrl.signal },
    );
    if (!cidRes.ok) return null;
    const cid: number | undefined = (await cidRes.json())?.IdentifierList?.CID?.[0];
    if (!cid) return null;

    const propRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`,
      { signal: ctrl.signal },
    );
    const props: Record<string, unknown> | undefined =
      (await propRes.json())?.PropertyTable?.Properties?.[0];

    // hazard GHS codes (safety section)
    let ghsCodes: string[] = [];
    try {
      const hRes = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON/?heading=GHS+Classification`,
        { signal: ctrl.signal },
      );
      const txt = JSON.stringify(await hRes.json());
      const hits = Array.from(new Set((txt.match(/GH[Ss]0?\d/g) || []).map((s) =>
        "GHS" + s.replace(/\D/g, "").padStart(2, "0"))));
      ghsCodes = hits.filter((c) => /^GHS0[1-9]$/.test(c)).sort();
    } catch { /* optional section */ }

    return {
      cid,
      iupac: String(props?.IUPACName ?? ""),
      formula: String(props?.MolecularFormula ?? ""),
      mw: props?.MolecularWeight != null ? Number(props.MolecularWeight) : null,
      ghsCodes,
    };
  } catch {
    return null;  // offline / timeout / 404 — all fine
  } finally {
    clearTimeout(timer);
  }
}
