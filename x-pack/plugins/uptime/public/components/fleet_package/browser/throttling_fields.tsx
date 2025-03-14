/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitch, EuiSpacer, EuiFormRow, EuiFieldNumber, EuiText } from '@elastic/eui';
import { DescribedFormGroupWithWrap } from '../common/described_form_group_with_wrap';

import { OptionalLabel } from '../optional_label';
import { useBrowserAdvancedFieldsContext } from '../contexts';
import { Validation, ConfigKey } from '../types';

interface Props {
  validate: Validation;
  minColumnWidth?: string;
  onFieldBlur?: (field: ConfigKey) => void;
}

type ThrottlingConfigs =
  | ConfigKey.IS_THROTTLING_ENABLED
  | ConfigKey.DOWNLOAD_SPEED
  | ConfigKey.UPLOAD_SPEED
  | ConfigKey.LATENCY;

export const ThrottlingFields = memo<Props>(({ validate, minColumnWidth, onFieldBlur }) => {
  const { fields, setFields } = useBrowserAdvancedFieldsContext();

  const handleInputChange = useCallback(
    ({ value, configKey }: { value: unknown; configKey: ThrottlingConfigs }) => {
      setFields((prevFields) => ({ ...prevFields, [configKey]: value }));
    },
    [setFields]
  );

  const throttlingInputs = fields[ConfigKey.IS_THROTTLING_ENABLED] ? (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.download.label"
            defaultMessage="Download Speed"
          />
        }
        labelAppend={<OptionalLabel />}
        isInvalid={!!validate[ConfigKey.DOWNLOAD_SPEED]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.download.error"
            defaultMessage="Download speed must be greater than zero."
          />
        }
      >
        <EuiFieldNumber
          min={0}
          step={0.001}
          value={fields[ConfigKey.DOWNLOAD_SPEED]}
          onChange={(event) => {
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKey.DOWNLOAD_SPEED,
            });
          }}
          onBlur={() => onFieldBlur?.(ConfigKey.DOWNLOAD_SPEED)}
          data-test-subj="syntheticsBrowserDownloadSpeed"
          append={
            <EuiText size="xs">
              <strong>Mbps</strong>
            </EuiText>
          }
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.upload.label"
            defaultMessage="Upload Speed"
          />
        }
        labelAppend={<OptionalLabel />}
        isInvalid={!!validate[ConfigKey.UPLOAD_SPEED]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.upload.error"
            defaultMessage="Upload speed must be greater than zero."
          />
        }
      >
        <EuiFieldNumber
          min={0}
          step={0.001}
          value={fields[ConfigKey.UPLOAD_SPEED]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKey.UPLOAD_SPEED,
            })
          }
          onBlur={() => onFieldBlur?.(ConfigKey.UPLOAD_SPEED)}
          data-test-subj="syntheticsBrowserUploadSpeed"
          append={
            <EuiText size="xs">
              <strong>Mbps</strong>
            </EuiText>
          }
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.latency.label"
            defaultMessage="Latency"
          />
        }
        labelAppend={<OptionalLabel />}
        isInvalid={!!validate[ConfigKey.LATENCY]?.(fields)}
        error={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.latency.error"
            defaultMessage="Latency must not be negative."
          />
        }
      >
        <EuiFieldNumber
          min={0}
          value={fields[ConfigKey.LATENCY]}
          onChange={(event) =>
            handleInputChange({
              value: event.target.value,
              configKey: ConfigKey.LATENCY,
            })
          }
          onBlur={() => onFieldBlur?.(ConfigKey.LATENCY)}
          data-test-subj="syntheticsBrowserLatency"
          append={
            <EuiText size="xs">
              <strong>ms</strong>
            </EuiText>
          }
        />
      </EuiFormRow>
    </>
  ) : null;

  return (
    <DescribedFormGroupWithWrap
      minColumnWidth={minColumnWidth}
      title={
        <h4>
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.title"
            defaultMessage="Throttling options"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.description"
          defaultMessage="Control the monitor's download and upload speeds, and its latency to simulate your application's behaviour on slower or laggier networks."
        />
      }
    >
      <EuiSwitch
        id={'uptimeFleetIsThrottlingEnabled'}
        aria-label="enable throttling configuration"
        data-test-subj="syntheticsBrowserIsThrottlingEnabled"
        checked={fields[ConfigKey.IS_THROTTLING_ENABLED]}
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.switch.description"
            defaultMessage="Enable throttling"
          />
        }
        onChange={(event) =>
          handleInputChange({
            value: event.target.checked,
            configKey: ConfigKey.IS_THROTTLING_ENABLED,
          })
        }
        onBlur={() => onFieldBlur?.(ConfigKey.IS_THROTTLING_ENABLED)}
      />
      {throttlingInputs}
    </DescribedFormGroupWithWrap>
  );
});
