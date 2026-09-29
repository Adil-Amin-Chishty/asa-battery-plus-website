import Storefront from "./storefront";
import { catalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  return <Storefront initialCatalog={await catalog(true)} />;
}
