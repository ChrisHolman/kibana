/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import type { ExploratoryEmbeddableProps, ExploratoryEmbeddableComponentProps } from './embeddable';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import type { IndexPatternState } from '../hooks/use_app_index_pattern';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import type { AppDataType } from '../types';

const Embeddable = React.lazy(() => import('./embeddable'));

function ExploratoryViewEmbeddable(props: ExploratoryEmbeddableComponentProps) {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <Embeddable {...props} />
    </React.Suspense>
  );
}

export function getExploratoryViewEmbeddable(
  core: CoreStart,
  plugins: ObservabilityPublicPluginsStart
) {
  return (props: ExploratoryEmbeddableProps) => {
    const [indexPatterns, setIndexPatterns] = useState<IndexPatternState>({} as IndexPatternState);
    const [loading, setLoading] = useState(false);

    const series = props.attributes && props.attributes[0];

    const isDarkMode = core.uiSettings.get('theme:darkMode');

    const loadIndexPattern = useCallback(
      async ({ dataType }: { dataType: AppDataType }) => {
        const dataTypesIndexPatterns = props.dataTypesIndexPatterns;

        setLoading(true);
        try {
          const obsvIndexP = new ObservabilityDataViews(plugins.dataViews);
          const indPattern = await obsvIndexP.getDataView(
            dataType,
            dataTypesIndexPatterns?.[dataType]
          );
          setIndexPatterns((prevState) => ({ ...(prevState ?? {}), [dataType]: indPattern }));

          setLoading(false);
        } catch (e) {
          setLoading(false);
        }
      },
      [props.dataTypesIndexPatterns]
    );

    useEffect(() => {
      if (series?.dataType) {
        loadIndexPattern({ dataType: series.dataType });
      }
    }, [series?.dataType, loadIndexPattern]);

    if (Object.keys(indexPatterns).length === 0 || loading) {
      return <EuiLoadingSpinner />;
    }

    return (
      <EuiThemeProvider darkMode={isDarkMode}>
        <ExploratoryViewEmbeddable {...props} indexPatterns={indexPatterns} lens={plugins.lens} />
      </EuiThemeProvider>
    );
  };
}
