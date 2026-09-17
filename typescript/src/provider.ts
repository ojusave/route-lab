import { fetchCatalog, generate } from "./adapters/openrouter";
import type { Answer, Catalog, Model } from "../../shared/types";

// Swap this adapter to change model providers. The workflow stays the same.
export const provider: {
  fetchCatalog(): Promise<Catalog>;
  generate(prompt: string, model: Model): Promise<Answer>;
} = { fetchCatalog, generate };
