/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { PartitionElementEvent } from '@elastic/charts';
import { ChartPanel } from '../../../components/chart_panel';
import { useCloudPostureStatsApi } from '../../../common/api';
import * as TEXT from '../translations';
import { CloudPostureScoreChart } from '../compliance_charts/cloud_posture_score_chart';
import { Evaluation } from '../../../../common/types';
import { RisksTable } from '../compliance_charts/risks_table';
import { CasesTable } from '../compliance_charts/cases_table';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { RULE_FAILED } from '../../../../common/constants';

const defaultHeight = 360;

// TODO: limit this to desktop media queries only
const summarySectionWrapperStyle = {
  height: defaultHeight,
};

export const SummarySection = () => {
  const navToFindings = useNavigateFindings();
  const getStats = useCloudPostureStatsApi();
  if (!getStats.isSuccess) return null;

  const handleElementClick = (elements: PartitionElementEvent[]) => {
    const [element] = elements;
    const [layerValue] = element;
    const evaluation = layerValue[0].groupByRollup as Evaluation;

    navToFindings({ 'result.evaluation': evaluation });
  };

  const handleCellClick = (resourceTypeName: string) => {
    navToFindings({ 'resource.type': resourceTypeName, 'result.evaluation': RULE_FAILED });
  };

  const handleViewAllClick = () => {
    navToFindings({ 'result.evaluation': RULE_FAILED });
  };

  return (
    <EuiFlexGrid columns={3} style={summarySectionWrapperStyle}>
      <EuiFlexItem>
        <ChartPanel
          title={TEXT.CLOUD_POSTURE_SCORE}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        >
          <CloudPostureScoreChart
            id="cloud_posture_score_chart"
            data={getStats.data.stats}
            partitionOnElementClick={handleElementClick}
          />
        </ChartPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel title={TEXT.RISKS} isLoading={getStats.isLoading} isError={getStats.isError}>
          <RisksTable
            data={getStats.data.resourcesTypes}
            maxItems={5}
            onCellClick={handleCellClick}
            onViewAllClick={handleViewAllClick}
          />
        </ChartPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <ChartPanel
          title={TEXT.OPEN_CASES}
          isLoading={getStats.isLoading}
          isError={getStats.isError}
        >
          <CasesTable />
        </ChartPanel>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
