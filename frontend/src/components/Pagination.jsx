import { ChevronLeft, ChevronRight } from "lucide-react";

const pageButtonClassName =
  "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-border text-sm text-primary enabled:hover:not-aria-[current=page]:bg-divider aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-on-primary disabled:cursor-default disabled:opacity-40";

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Seleciona até três páginas consecutivas próximas da atual, ajustando o intervalo nas extremidades.
  const firstPage = Math.max(1, Math.min(page - 1, totalPages - 2));
  const visiblePages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => firstPage + index,
  );

  // Inclui as extremidades e usa null para representar intervalos de páginas omitidas.
  const pages = [...visiblePages];
  if (firstPage > 1) {
    if (firstPage > 2) pages.unshift(null);
    pages.unshift(1);
  }
  if (firstPage + visiblePages.length <= totalPages) {
    if (firstPage + visiblePages.length < totalPages) pages.push(null);
    pages.push(totalPages);
  }

  return (
    <nav
      className="mt-7 flex items-center justify-center gap-2.5 sm:gap-4.5"
      aria-label="Páginas do acervo"
    >
      <button
        type="button"
        className={pageButtonClassName}
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      {pages.map((number, index) =>
        number === null ? (
          <span key={`ellipsis-${index}`}>…</span>
        ) : (
          <button
            key={number}
            type="button"
            className={pageButtonClassName}
            aria-label={`Página ${number}`}
            aria-current={number === page ? "page" : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ),
      )}
      <button
        type="button"
        className={pageButtonClassName}
        aria-label="Próxima página"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </nav>
  );
};

export default Pagination;
