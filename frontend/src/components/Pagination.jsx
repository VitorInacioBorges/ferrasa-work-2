import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageButton } from "./PageButton.jsx";

// Calcula os números visíveis e informa a página escolhida ao componente responsável pelos dados.
const Pagination = ({ page, totalPages, onPageChange }) => {
  // Uma única página ou um resultado vazio dispensa os controles de navegação.
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
      {/* Bloqueia a navegação para trás quando a primeira página está selecionada. */}
      <PageButton
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </PageButton>
      {/* Os intervalos omitidos viram reticências, e aria-current identifica a página selecionada. */}
      {pages.map((number, index) =>
        number === null ? (
          <span key={`ellipsis-${index}`}>…</span>
        ) : (
          <PageButton
            key={number}
            aria-label={`Página ${number}`}
            aria-current={number === page ? "page" : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </PageButton>
        ),
      )}
      {/* Bloqueia a navegação para frente quando a última página está selecionada. */}
      <PageButton
        aria-label="Próxima página"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </PageButton>
    </nav>
  );
};

export default Pagination;
