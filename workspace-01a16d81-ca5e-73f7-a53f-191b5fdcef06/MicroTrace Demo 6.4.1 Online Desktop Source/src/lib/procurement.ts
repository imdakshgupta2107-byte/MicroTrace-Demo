// procurement — stock math, low-stock alerts, PO helpers.
import type { Chemical, Container, PriceComparison, StockAlert, Vendor, VendorPrice } from "./types";
import { expiryState } from "./expiry";

/** Physical quantity, including expired stock still awaiting quarantine/disposal. */
export const chemicalStock = (chem: Chemical, containers: Container[]): number =>
  containers
    .filter((c) => c.chemical_id === chem.id && c.state !== "disposed")
    .reduce((s, c) => s + c.qty, 0);

/** Quantity eligible for issue: never suggest an expired, depleted or disposed lot. */
export const usableChemicalStock = (chem: Chemical, containers: Container[]): number =>
  containers
    .filter((c) => c.chemical_id === chem.id && c.state !== "disposed" && c.state !== "depleted" && c.state !== "quarantined" && c.qty > 0 && expiryState(c).state !== "expired")
    .reduce((sum, container) => sum + container.qty, 0);

export const isLow = (chem: Chemical, containers: Container[]): boolean =>
  usableChemicalStock(chem, containers) <= chem.min_stock;

export function priceComparisons(
  chem: Chemical, prices: VendorPrice[], vendors: Vendor[],
): PriceComparison[] {
  const rows = prices
    .filter((p) => p.chemical_id === chem.id)
    .map((p) => ({
      ...p,
      per_unit: p.pack_size > 0 ? p.price_inr / p.pack_size : 0,
      vendor_name: vendors.find((v) => v.id === p.vendor_id)?.name ?? "(vendor removed)",
    }));
  if (!rows.length) return [];
  const best = Math.min(...rows.map((r) => r.per_unit));
  return rows
    .map((r) => ({ ...r, is_best: r.per_unit === best }))
    .sort((a, b) => a.per_unit - b.per_unit);
}

export function stockAlerts(
  chemicals: Chemical[], containers: Container[], prices: VendorPrice[], vendors: Vendor[],
): StockAlert[] {
  return chemicals
    .map((chem) => {
      const stock = usableChemicalStock(chem, containers);
      return {
        chemical: chem, stock,
        shortfall: Math.max(0, chem.min_stock - stock + 1),
        comparisons: priceComparisons(chem, prices, vendors),
      };
    })
    .filter((a) => a.stock <= a.chemical.min_stock)
    .sort((a, b) => b.shortfall - a.shortfall);
}

export const bestUnitPrice = (chem: Chemical, prices: VendorPrice[]): number => {
  const ps = prices.filter((p) => p.chemical_id === chem.id && p.pack_size > 0);
  return ps.length ? Math.min(...ps.map((p) => p.price_inr / p.pack_size)) : 0;
};
