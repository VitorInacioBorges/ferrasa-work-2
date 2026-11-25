import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import FormField from "./FormField.jsx";

function normalize(value) {
  return value.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const allAuthors = { id: "", name: "Todos os autores" };

export default function AuthorPicker({ authors, status, selected, errors, onSelect, variant = "form", describedBy }) {
  const isFilter = variant === "filter";
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = normalize(query);
  const choices = isFilter ? [allAuthors, ...authors] : authors;
  const options = term ? choices.filter(({ name }) => normalize(name).includes(term)) : choices;
  const activeId = open && options[active] ? listId + "-" + options[active].id : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function choose(author) {
    onSelect(author === allAuthors ? null : author);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function handleKey(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(event.key === "ArrowDown"
        ? Math.min(active + 1, options.length - 1)
        : active <= 0 ? options.length - 1 : active - 1);
    } else if (open && event.key === "Enter") {
      event.preventDefault();
      if (options[active] || options.length === 1) choose(options[active] ?? options[0]);
    } else if (event.key === "Escape") {
      if (isFilter) setQuery("");
      setOpen(false);
      setActive(-1);
    }
  }

  const placeholder = {
    loading: "Carregando autores…",
    error: "Autores indisponíveis",
    ready: authors.length ? "Selecione ou digite o nome do autor" : "Nenhum autor cadastrado",
  }[status];

  const Control = isFilter ? "input" : FormField;
  const fieldProps = isFilter ? {
    "aria-label": "Filtrar por autor",
    "aria-invalid": errors?.length ? true : undefined,
    "aria-describedby": describedBy,
    className: "h-9.5 w-full rounded-md border border-border bg-white/20 pr-10 pl-4 text-sm shadow-[0_1px_2px_#302a2514] placeholder:text-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
  } : { label: "Autor", required: true, errors };

  return (
    <div className="relative">
      <Control
        {...fieldProps}
        name="authorId"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        value={isFilter && open ? query : selected?.name ?? query}
        placeholder={isFilter ? (selected?.name ?? allAuthors.name) : placeholder}
        disabled={isFilter ? status === "error" : !authors.length}
        onFocus={({ target }) => { target.select(); setOpen(true); }}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          if (isFilter) setQuery("");
        }}
        onKeyDown={handleKey}
        onChange={({ target }) => {
          if (!isFilter) onSelect(null);
          setQuery(target.value);
          setActive(-1);
          setOpen(true);
        }}
      />
      {isFilter && <ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute top-2.5 right-3.5" />}
      <div hidden={!open} className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
        <ul id={listId} role="listbox" aria-label="Autores">
          {options.map((author, index) => (
            <li
              key={author.id}
              id={listId + "-" + author.id}
              role="option"
              aria-selected={(selected?.id ?? "") === author.id}
              className={`cursor-pointer px-4 py-2 hover:bg-primary/10 ${active === index ? "bg-primary/10" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(author)}
            >
              {author.name}
            </li>
          ))}
        </ul>
        {!options.length && <p role="status" className="px-4 py-2 text-sm text-muted">Nenhum autor encontrado.</p>}
      </div>
    </div>
  );
}
