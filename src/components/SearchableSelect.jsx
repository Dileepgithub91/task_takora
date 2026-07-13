import React, { useEffect, useMemo, useRef, useState } from 'react';

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

export default function SearchableSelect({
  value = '',
  options = [],
  placeholder = 'Search',
  onChange,
  className = '',
  disabled = false,
  required = false,
  onTextChange,
  allowCustomValue = false,
  maxVisible = 80,
  selectOnFocus = true
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const selected = useMemo(
    () => options.find(option => String(option.value) === String(value || '')),
    [options, value]
  );
  const [query, setQuery] = useState(selected?.label || '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setQuery(selected?.label || '');
  }, [selected?.label]);

  useEffect(() => {
    function handleClick(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    const text = normalize(query);
    const base = text
      ? options.filter(option => {
          const haystack = `${option.label || ''} ${option.subLabel || ''} ${option.value || ''}`.toLowerCase();
          return haystack.includes(text);
        })
      : options;

    return base.slice(0, maxVisible);
  }, [options, query, maxVisible]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function choose(option) {
    setQuery(option?.label || '');
    setOpen(false);
    onChange?.(option?.value ?? '', option || null);
  }

  function handleInput(event) {
    const text = event.target.value;
    setQuery(text);
    setOpen(true);
    onTextChange?.(text);

    if (!text.trim()) {
      onChange?.('', null);
      return;
    }

    const exact = options.find(option => normalize(option.label) === normalize(text) || normalize(option.value) === normalize(text));
    if (exact) {
      onChange?.(exact.value, exact);
    } else if (allowCustomValue) {
      onChange?.(text, { value: text, label: text, custom: true });
    }
  }

  function handleFocus(event) {
    setOpen(true);
    if (selectOnFocus) {
      setTimeout(() => event.target.select(), 0);
    }
  }

  function handleKeyDown(event) {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      setOpen(true);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    }

    if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    }

    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function clear() {
    setQuery('');
    setOpen(false);
    onTextChange?.('');
    onChange?.('', null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className={`searchSelect ${className}`} ref={wrapRef}>
      <input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !value}
        onChange={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {query && !disabled ? (
        <button type="button" className="searchSelectClear" onClick={clear} aria-label="Clear selection">×</button>
      ) : null}
      <button
        type="button"
        className="searchSelectToggle"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => {
          setOpen(previous => !previous);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-label="Open options"
      >
        ▾
      </button>
      {open && !disabled && (
        <div className="searchSelectMenu">
          {filtered.length === 0 && <div className="searchSelectEmpty">No matching option</div>}
          {filtered.map((option, index) => (
            <button
              type="button"
              key={`${option.value}-${option.label}`}
              className={`searchSelectOption ${String(option.value) === String(value || '') ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <b>{option.label}</b>
              {option.subLabel && <span>{option.subLabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
