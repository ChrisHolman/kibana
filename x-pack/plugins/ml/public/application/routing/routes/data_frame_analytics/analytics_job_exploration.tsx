/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { NavigateToPath, useMlKibana, useMlLocator } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_exploration';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';
import { useUrlState } from '../../../util/url_state';

export const analyticsJobExplorationRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/data_frame_analytics/exploration',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  title: i18n.translate('xpack.ml.dataFrameAnalytics.exploration.docTitle', {
    defaultMessage: 'Exploration',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameExplorationLabel', {
        defaultMessage: 'Exploration',
      }),
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    basicResolvers(deps)
  );

  const [globalState] = useUrlState('_g');

  const locator = useMlLocator();
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToAnalyticsManagementPage = async () => {
    if (!locator) return;
    const url = await locator.getUrl({ page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE });
    await navigateToUrl(url);
  };

  const jobId: string = globalState.ml.jobId;
  const analysisType: DataFrameAnalysisConfigType = globalState.ml.analysisType;

  if (!analysisType) {
    redirectToAnalyticsManagementPage();
  }

  return (
    <PageLoader context={context}>
      <Page {...{ jobId, analysisType }} />
    </PageLoader>
  );
};
