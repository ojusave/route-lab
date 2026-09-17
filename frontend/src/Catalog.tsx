import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import type { Catalog as ModelCatalog, Decision } from "../../shared/types";
export const price = (value: number | null) =>
  value === null
    ? "Not listed"
    : value === 0
      ? "Free"
      : `$${value.toLocaleString("en-US", { maximumFractionDigits: 3 })}`;
export default function Catalog({
  catalog,
  decision,
  loading,
  refresh,
  error,
  promptBytes,
}: {
  promptBytes: number;
  catalog: ModelCatalog | null;
  decision: Decision | null;
  loading: boolean;
  refresh: () => void;
  error: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [onlyEligible, setOnlyEligible] = useState(false);
  useEffect(() => setPage(0), [search, onlyEligible, catalog]);
  const models = (catalog?.models ?? []).filter(
    (m) =>
      (!onlyEligible || m.eligible) &&
      `${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(models.length / 12));
  const visible = models.slice(page * 12, page * 12 + 12);
  return (
    <section
      className="catalog-section"
      id="models"
      aria-labelledby="catalog-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">DIRECT FROM OPENROUTER</span>
          <h2 id="catalog-title">Live model catalog</h2>
        </div>
        <button className="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh catalog
        </button>
      </div>
      <div className="catalog-toolbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search all models"
            placeholder="Search models or providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={onlyEligible}
            onChange={(e) => setOnlyEligible(e.target.checked)}
          />
          Text-compatible only
        </label>
        <span className="muted">
          {models.length} model{models.length === 1 ? "" : "s"}
        </span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Context</th>
              <th>Input / 1M tokens</th>
              <th>Output / 1M tokens</th>
              <th>In this demo</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr
                key={m.id}
                className={decision?.choice === m.id ? "selected-row" : ""}
              >
                <td>
                  <strong>{m.name}</strong>
                  <span className="model-id">{m.id}</span>
                </td>
                <td>
                  {new Intl.NumberFormat("en", { notation: "compact" }).format(
                    m.contextLength,
                  )}
                </td>
                <td>{price(m.inputPrice)}</td>
                <td>{price(m.outputPrice)}</td>
                <td>
                  <span
                    className={
                      m.eligible && m.contextLength >= promptBytes + 2000
                        ? "eligible"
                        : "excluded"
                    }
                  >
                    {decision?.choice === m.id
                      ? "Selected"
                      : m.eligible && m.contextLength >= promptBytes + 2000
                        ? "Eligible"
                        : "Excluded"}
                  </span>
                  {(m.exclusion || m.contextLength < promptBytes + 2000) && (
                    <span className="exclusion">
                      {m.exclusion ||
                        "Context too short for this prompt and answer budget."}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={5} className="empty-table">
                  {loading
                    ? "Fetching the current catalog..."
                    : search
                      ? "No models match your search."
                      : "Catalog unavailable. Refresh to try again."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          {catalog
            ? `Fetched ${new Date(catalog.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}. Listed base prices, not a quote.`
            : "Waiting for OpenRouter."}
        </span>
        <div className="pagination">
          <button
            className="icon-button"
            aria-label="Previous model page"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next model page"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <p className="fineprint">
        Each run fetches a new snapshot. Text compatibility and a conservative
        context check determine eligibility; account restrictions and provider
        availability can still prevent generation.{" "}
        <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">
          OpenRouter models <ArrowUpRight size={12} />
        </a>
      </p>
    </section>
  );
}
