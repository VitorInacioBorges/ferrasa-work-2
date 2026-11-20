import { useEffect, useId, useState } from "react";
import FormField from "./FormField.jsx";

function normalize(value) {
  return value.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export default function AuthorPicker({ authors, status, selected, errors, onSelect }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = normalize(query);
  const options = term ? authors.filter(({ name }) => normalize(name).includes(term)) : authors;
  const activeId = open && options[active] ? listId + "-" + options[active].id : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function choose(author) {
    onSelect(author);
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
      setOpen(false);
      setActive(-1);
    }
  }

  const placeholder = {
    loading: "Carregando autores…",
    error: "Autores indisponíveis",
    ready: authors.length ? "Selecione ou digite o nome do autor" : "Nenhum autor cadastrado",
  }[status];

  return (
    <div className="relative">
      <FormField
        label="Autor"
        name="authorId"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        value={selected?.name ?? query}
        placeholder={placeholder}
        errors={errors}
        disabled={!authors.length}
        required
        onFocus={({ target }) => { target.select(); setOpen(true); }}
        onClick={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1); }}
        onKeyDown={handleKey}
        onChange={({ target }) => {
          onSelect(null);
          setQuery(target.value);
          setActive(-1);
          setOpen(true);
        }}
      />
      <div hidden={!open} className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
        <ul id={listId} role="listbox" aria-label="Autores">
          {options.map((author, index) => (
            <li
              key={author.id}
              id={listId + "-" + author.id}
              role="option"
              aria-selected={selected?.id === author.id}
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
