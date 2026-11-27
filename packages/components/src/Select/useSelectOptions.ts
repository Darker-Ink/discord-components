import { useCallback, useEffect, useMemo, useState } from 'react';
import { flattenOptionGroups, type ListboxOption, type ListboxOptionGroup } from '../Listbox';

export type SelectOptions<T extends ListboxOption> =
  T[] | ListboxOptionGroup<T>[] | ((query: string | null) => Promise<T[] | ListboxOptionGroup<T>[]>);

interface OptionsState<T extends ListboxOption> {
  options: T[] | ListboxOptionGroup<T>[];
  query: string;
  debouncedQuery: string | null;
  loading: boolean;
}

/** Resolves static or async options (async ones debounced by the query) and flattens groups. */
export const useSelectOptions = <T extends ListboxOption>({
  active,
  options,
  renderOption,
}: {
  active: boolean;
  options: SelectOptions<T>;
  renderOption?: (option: T) => T;
}) => {
  const isAsync = typeof options === 'function';
  const [state, setState] = useState<OptionsState<T>>({
    options: isAsync ? [] : options,
    query: '',
    debouncedQuery: '',
    loading: false,
  });
  const { options: resolvedOptions, loading, query, debouncedQuery } = state;
  const applyQuery = useCallback(
    (value: string) => setState((current) => ({ ...current, loading: isAsync, query: value, debouncedQuery: value })),
    [isAsync],
  );
  useEffect(() => {
    // Each time the dropdown opens it starts from an empty query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) applyQuery('');
  }, [active, applyQuery]);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (isAsync) {
      // Async options show the spinner while the query is debounced.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((current) => ({ ...current, loading: true, debouncedQuery: null }));
      timeout = setTimeout(() => {
        applyQuery(query);
      }, 500);
    } else applyQuery(query);
    return () => {
      clearTimeout(timeout);
    };
  }, [isAsync, query, applyQuery]);
  useEffect(() => {
    let canceled = false;
    if ((active && debouncedQuery !== null && isAsync) || !isAsync) {
      void (async () => {
        let next = await (typeof options === 'function' ? options(debouncedQuery) : Promise.resolve(options));
        if (canceled) return;
        if (renderOption != null) next = (next as T[]).map(renderOption);
        setState((current) => ({ ...current, options: next, loading: false }));
      })();
    }
    return () => {
      canceled = true;
    };
  }, [active, options, debouncedQuery, renderOption, isAsync]);
  const onQueryChange = useCallback((value: string) => {
    setState((current) => ({ ...current, query: value }));
  }, []);
  const { flatOptions, groups } = useMemo(() => flattenOptionGroups(resolvedOptions), [resolvedOptions]);
  return { options: flatOptions, groups, loading, onQueryChange };
};
