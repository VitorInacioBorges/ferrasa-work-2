import { useState } from 'react';
import { BookOpen } from 'lucide-react';

const BookCard = ({ coverUrl, title, authorName, loading = false }) => {
  // Guarda a URL que falhou para exibir a alternativa, permitindo tentar uma nova capa se a prop mudar.
  const [failedCover, setFailedCover] = useState(null);

  // A largura da capa vem do layout pai (--cover-width), com 180px como valor padrão.
  const coverClassName = 'relative z-1 h-full w-[var(--cover-width,180px)] rounded-xs object-cover shadow-[2px_5px_8px_#302a2530]';
  // Mantém a proporção 3:4 da capa e desenha a madeira abaixo dela com o pseudoelemento ::after.
  const coverStageClassName = "relative flex h-[calc(var(--cover-width,180px)*4/3)] w-full justify-center after:absolute after:inset-x-0 after:top-[calc(100%-5px)] after:h-5 after:border-b-[3px] after:border-wood-dark after:bg-[linear-gradient(to_bottom,var(--color-wood-light)_0%,#f5dfbd_58%,var(--color-wood)_60%,var(--color-wood-light)_80%,var(--color-wood)_100%)] after:shadow-[0_10px_12px_-4px_#79552e55] after:content-['']";

  return (
    // Os espaços reservados de carregamento são decorativos e ficam ocultos dos leitores de tela.
    <article className="flex w-full flex-col items-center text-center gap-4.5" aria-hidden={loading || undefined}>
      <div className={coverStageClassName}>
        {/* Prioriza o carregamento; depois, exibe a capa válida ou a alternativa para capa ausente/com erro. */}
        {loading ? (
          <div className={`${coverClassName} bg-divider`} />
        ) : coverUrl && failedCover !== coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa do livro ${title}`}
            width={192}
            height={256}
            loading="lazy"
            decoding="async"
            onError={() => setFailedCover(coverUrl)}
            className={coverClassName}
          />
        ) : (
          <div className={`${coverClassName} flex flex-col items-center justify-center gap-3 border border-border bg-surface p-4 text-primary`}>
            <BookOpen size={40} strokeWidth={1.3} aria-hidden="true" />
            <span className="text-xs">Capa indisponível</span>
          </div>
        )}
      </div>

      {/* Os blocos reservam espaço para título e autor enquanto os dados do livro são buscados. */}
      {loading ? (
        <>
          <div className="h-3.5 w-[65%] rounded-[3px] bg-divider" />
          <div className="-mt-2 h-2.5 w-1/2 rounded-[3px] bg-divider" />
        </>
      ) : (
        <div className="w-full px-2 sm:px-3">
          <h3 className="text-sm leading-tight font-bold wrap-break-word text-heading sm:text-base mx-auto max-w-50">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-tight wrap-break-word text-muted sm:text-sm">
            {authorName}
          </p>
        </div>
      )}
    </article>
  );
};

export default BookCard;
