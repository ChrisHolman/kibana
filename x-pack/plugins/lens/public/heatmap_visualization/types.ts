/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput } from '../../../../../src/plugins/charts/common';
import type { HeatmapArguments } from '../../../../../src/plugins/chart_expressions/expression_heatmap/common';
import type { CustomPaletteParams, LayerType } from '../../common';
export type ChartShapes = 'heatmap';

export type HeatmapLayerState = HeatmapArguments & {
  layerId: string;
  layerType: LayerType;
  valueAccessor?: string;
  xAccessor?: string;
  yAccessor?: string;
  shape: ChartShapes;
};

export type Palette = PaletteOutput<CustomPaletteParams> & { accessor: string };

export type HeatmapVisualizationState = HeatmapLayerState & {
  // need to store the current accessor to reset the color stops at accessor change
  palette?: Palette;
};
