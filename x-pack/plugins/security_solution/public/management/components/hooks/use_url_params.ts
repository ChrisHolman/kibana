/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { parse, stringify, ParsedQuery } from 'query-string';
import { useLocation } from 'react-router-dom';

/**
 * Parses `search` params and returns an object with them along with a `toUrlParams` function
 * that allows being able to retrieve a stringified version of an object (default is the
 * `urlParams` that was parsed) for use in the url.
 * Object will be recreated every time `search` changes.
 */
export function useUrlParams(): {
  urlParams: ParsedQuery<string>;
  toUrlParams: (params: ParsedQuery<string | number>) => string;
} {
  const { search } = useLocation();
  return useMemo(() => {
    const urlParams = parse(search);
    return {
      urlParams,
      toUrlParams: (params = urlParams) => stringify(params),
    };
  }, [search]);
}
