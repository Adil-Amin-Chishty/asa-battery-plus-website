import type { Battery } from "@/data/batteries";

export type CatalogBrand = { id: string; name: string };
export type CatalogProduct = Battery & {
  brandId: string;
  active: boolean;
  revision: number;
};
export type Catalog = { brands: CatalogBrand[]; products: CatalogProduct[] };
