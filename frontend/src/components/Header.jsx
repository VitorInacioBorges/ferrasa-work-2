import { BookOpen } from "lucide-react";
import { Link, NavLink, useMatch } from "react-router";

// Compartilha os estilos dos links e destaca a seção indicada por aria-current.
const navLinkClassName =
  "rounded-xs border-b-2 border-transparent px-1 py-1 text-md text-body no-underline transition-colors duration-150 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary aria-[current=page]:border-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary"
const Header = () => {
  // Cadastro e edição de livros também pertencem à seção Acervo.
  const isCollection = useMatch("/");
  const isBook = useMatch("/livros/*");

  return (
    <header className="flex min-h-16 items-center gap-2.5 bg-background px-3 py-2 sm:gap-10 sm:px-15">
      {/* A marca leva à página inicial e possui um nome acessível para leitores de tela. */}
      <Link
        to="/"
        aria-label="Biblioteca — início"
        className="flex shrink-0 items-center gap-2 rounded-xs leading-none font-bold tracking-tight whitespace-nowrap text-heading no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:gap-3 sm:text-[32px]"
      >
        <BookOpen
          strokeWidth={1.6}
          aria-hidden="true"
          focusable="false"
          className="h-7 w-8 shrink-0 text-primary sm:h-9 sm:w-11"
        />
        <span className="text-lg">Biblioteca</span>
      </Link>

      <span aria-hidden="true" className="h-7 w-px shrink-0 bg-border" />

      <nav
        aria-label="Navegação principal"
        className="flex  items-center gap-2 sm:gap-8"
      >
        {/* O Acervo considera suas subpáginas, enquanto NavLink identifica automaticamente Autores. */}
        <Link
          to="/"
          aria-current={isCollection || isBook ? "page" : undefined}
          className={navLinkClassName}
        >
          Acervo
        </Link>
        <NavLink to="/autores" className={navLinkClassName}>
          Autores
        </NavLink>
      </nav>
    </header>
  );
};

export default Header;
