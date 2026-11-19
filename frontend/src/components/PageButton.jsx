// Padroniza os botões de paginação e destaca a página atual pelo atributo aria-current.
// As props fornecem o clique, o nome acessível e o bloqueio nas extremidades da lista.
export function PageButton(props) {
  return (
    <button
      type="button"
      className="flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-border text-sm text-primary enabled:hover:not-aria-[current=page]:bg-divider aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-on-primary disabled:cursor-default disabled:opacity-40"
      {...props}
    />
  );
}
