/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExecutionHandler, CreateExecutionHandlerOptions } from './create_execution_handler';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import {
  actionsMock,
  actionsClientMock,
  renderActionParameterTemplatesDefault,
} from '../../../actions/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { KibanaRequest } from 'kibana/server';
import { asSavedObjectExecutionSource } from '../../../actions/server';
import { InjectActionParamsOpts } from './inject_action_params';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';

jest.mock('./inject_action_params', () => ({
  injectActionParams: jest.fn(),
}));

const ruleType: NormalizedRuleType<
  AlertTypeParams,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default' | 'other-group',
  'recovered'
> = {
  id: 'test',
  name: 'Test',
  actionGroups: [
    { id: 'default', name: 'Default' },
    { id: 'other-group', name: 'Other Group' },
  ],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  executor: jest.fn(),
  producer: 'alerts',
};

const actionsClient = actionsClientMock.create();

const mockActionsPlugin = actionsMock.createStart();
const mockEventLogger = eventLoggerMock.create();
const createExecutionHandlerParams: jest.Mocked<
  CreateExecutionHandlerOptions<
    AlertTypeParams,
    AlertTypeParams,
    AlertTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    'default' | 'other-group',
    'recovered'
  >
> = {
  actionsPlugin: mockActionsPlugin,
  spaceId: 'test1',
  ruleId: '1',
  ruleName: 'name-of-alert',
  executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  tags: ['tag-A', 'tag-B'],
  apiKey: 'MTIzOmFiYw==',
  kibanaBaseUrl: 'http://localhost:5601',
  ruleType,
  logger: loggingSystemMock.create().get(),
  eventLogger: mockEventLogger,
  actions: [
    {
      id: '1',
      group: 'default',
      actionTypeId: 'test',
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal: 'My {{alertId}} {{alertName}} {{spaceId}} {{tags}} {{alertInstanceId}} goes here',
      },
    },
  ],
  request: {} as KibanaRequest,
  ruleParams: {
    foo: true,
    contextVal: 'My other {{context.value}} goes here',
    stateVal: 'My other {{state.value}} goes here',
  },
  supportsEphemeralTasks: false,
  maxEphemeralActionsPerRule: 10,
};

describe('Create Execution Handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .requireMock('./inject_action_params')
      .injectActionParams.mockImplementation(
        ({ actionParams }: InjectActionParamsOpts) => actionParams
      );
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    mockActionsPlugin.isActionExecutable.mockReturnValue(true);
    mockActionsPlugin.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    mockActionsPlugin.renderActionParameterTemplates.mockImplementation(
      renderActionParameterTemplatesDefault
    );
  });

  test('enqueues execution per selected action', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    const result = await executionHandler({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
    });
    expect(result).toHaveLength(1);
    expect(mockActionsPlugin.getActionsClientWithRequest).toHaveBeenCalledWith(
      createExecutionHandlerParams.request
    );
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
        "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
        "id": "1",
        "params": Object {
          "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 2 goes here",
          "contextVal": "My  goes here",
          "foo": true,
          "stateVal": "My  goes here",
        },
        "relatedSavedObjects": Array [
          Object {
            "id": "1",
            "namespace": "test1",
            "type": "alert",
            "typeId": "test",
          },
        ],
        "source": Object {
          "source": Object {
            "id": "1",
            "type": "alert",
          },
          "type": "SAVED_OBJECT",
        },
        "spaceId": "test1",
      },
    ]
  `);

    expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockEventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-action",
            "category": Array [
              "alerts",
            ],
            "kind": "alert",
          },
          "kibana": Object {
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                },
              },
            },
            "alerting": Object {
              "action_group_id": "default",
              "instance_id": "2",
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "rel": "primary",
                "type": "alert",
                "type_id": "test",
              },
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "action",
                "type_id": "test",
              },
            ],
          },
          "message": "alert: test:1: 'name-of-alert' instanceId: '2' scheduled actionGroup: 'default' action: test:1",
          "rule": Object {
            "category": "test",
            "id": "1",
            "license": "basic",
            "name": "name-of-alert",
            "ruleset": "alerts",
          },
        },
      ],
    ]
  `);

    expect(jest.requireMock('./inject_action_params').injectActionParams).toHaveBeenCalledWith({
      ruleId: '1',
      spaceId: 'test1',
      actionTypeId: 'test',
      actionParams: {
        alertVal: 'My 1 name-of-alert test1 tag-A,tag-B 2 goes here',
        contextVal: 'My  goes here',
        foo: true,
        stateVal: 'My  goes here',
      },
    });
  });

  test(`doesn't call actionsPlugin.execute for disabled actionTypes`, async () => {
    // Mock two calls, one for check against actions[0] and the second for actions[1]
    mockActionsPlugin.isActionExecutable.mockReturnValueOnce(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(true);
    const executionHandler = createExecutionHandler({
      ...createExecutionHandlerParams,
      actions: [
        ...createExecutionHandlerParams.actions,
        {
          id: '2',
          group: 'default',
          actionTypeId: 'test2',
          params: {
            foo: true,
            contextVal: 'My other {{context.value}} goes here',
            stateVal: 'My other {{state.value}} goes here',
          },
        },
      ],
    });
    await executionHandler({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
    });
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution).toHaveBeenCalledWith({
      id: '2',
      params: {
        foo: true,
        contextVal: 'My other  goes here',
        stateVal: 'My other  goes here',
      },
      source: asSavedObjectExecutionSource({
        id: '1',
        type: 'alert',
      }),
      relatedSavedObjects: [
        {
          id: '1',
          namespace: 'test1',
          type: 'alert',
          typeId: 'test',
        },
      ],
      spaceId: 'test1',
      apiKey: createExecutionHandlerParams.apiKey,
      executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
    });
  });

  test('trow error error message when action type is disabled', async () => {
    mockActionsPlugin.preconfiguredActions = [];
    mockActionsPlugin.isActionExecutable.mockReturnValue(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(false);
    const executionHandler = createExecutionHandler({
      ...createExecutionHandlerParams,
      actions: [
        ...createExecutionHandlerParams.actions,
        {
          id: '2',
          group: 'default',
          actionTypeId: '.slack',
          params: {
            foo: true,
            contextVal: 'My other {{context.value}} goes here',
            stateVal: 'My other {{state.value}} goes here',
          },
        },
      ],
    });

    const result = await executionHandler({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
    });
    expect(result).toEqual([]);
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(0);

    mockActionsPlugin.isActionExecutable.mockImplementation(() => true);
    const executionHandlerForPreconfiguredAction = createExecutionHandler({
      ...createExecutionHandlerParams,
      actions: [...createExecutionHandlerParams.actions],
    });
    await executionHandlerForPreconfiguredAction({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
    });
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('limits actionsPlugin.execute per action group', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    const result = await executionHandler({
      actionGroup: 'other-group',
      state: {},
      context: {},
      alertId: '2',
    });
    expect(result).toEqual([]);
    expect(actionsClient.enqueueExecution).not.toHaveBeenCalled();
  });

  test('context attribute gets parameterized', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    const result = await executionHandler({
      actionGroup: 'default',
      context: { value: 'context-val' },
      state: {},
      alertId: '2',
    });
    expect(result).toHaveLength(1);
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
        "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
        "id": "1",
        "params": Object {
          "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 2 goes here",
          "contextVal": "My context-val goes here",
          "foo": true,
          "stateVal": "My  goes here",
        },
        "relatedSavedObjects": Array [
          Object {
            "id": "1",
            "namespace": "test1",
            "type": "alert",
            "typeId": "test",
          },
        ],
        "source": Object {
          "source": Object {
            "id": "1",
            "type": "alert",
          },
          "type": "SAVED_OBJECT",
        },
        "spaceId": "test1",
      },
    ]
  `);
  });

  test('state attribute gets parameterized', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    const result = await executionHandler({
      actionGroup: 'default',
      context: {},
      state: { value: 'state-val' },
      alertId: '2',
    });
    expect(result).toHaveLength(1);
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
        "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
        "id": "1",
        "params": Object {
          "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 2 goes here",
          "contextVal": "My  goes here",
          "foo": true,
          "stateVal": "My state-val goes here",
        },
        "relatedSavedObjects": Array [
          Object {
            "id": "1",
            "namespace": "test1",
            "type": "alert",
            "typeId": "test",
          },
        ],
        "source": Object {
          "source": Object {
            "id": "1",
            "type": "alert",
          },
          "type": "SAVED_OBJECT",
        },
        "spaceId": "test1",
      },
    ]
  `);
  });

  test(`logs an error when action group isn't part of actionGroups available for the ruleType`, async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    const result = await executionHandler({
      // we have to trick the compiler as this is an invalid type and this test checks whether we
      // enforce this at runtime as well as compile time
      actionGroup: 'invalid-group' as 'default' | 'other-group',
      context: {},
      state: {},
      alertId: '2',
    });
    expect(result).toEqual([]);
    expect(createExecutionHandlerParams.logger.error).toHaveBeenCalledWith(
      'Invalid action group "invalid-group" for rule "test".'
    );
  });
});
