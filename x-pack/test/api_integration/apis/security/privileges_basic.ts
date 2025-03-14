/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import util from 'util';
import { isEqual, isEqualWith } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Privileges', () => {
    describe('GET /api/security/privileges', () => {
      it('should return a privilege map with all known privileges, without actions', async () => {
        // If you're adding a privilege to the following, that's great!
        // If you're removing a privilege, this breaks backwards compatibility
        // Roles are associated with these privileges, and we shouldn't be removing them in a minor version.
        const expected = {
          features: {
            discover: ['all', 'read', 'minimal_all', 'minimal_read'],
            visualize: ['all', 'read', 'minimal_all', 'minimal_read'],
            dashboard: ['all', 'read', 'minimal_all', 'minimal_read'],
            dev_tools: ['all', 'read', 'minimal_all', 'minimal_read'],
            advancedSettings: ['all', 'read', 'minimal_all', 'minimal_read'],
            indexPatterns: ['all', 'read', 'minimal_all', 'minimal_read'],
            savedObjectsManagement: ['all', 'read', 'minimal_all', 'minimal_read'],
            savedObjectsTagging: ['all', 'read', 'minimal_all', 'minimal_read'],
            graph: ['all', 'read', 'minimal_all', 'minimal_read'],
            maps: ['all', 'read', 'minimal_all', 'minimal_read'],
            observabilityCases: ['all', 'read', 'minimal_all', 'minimal_read'],
            canvas: ['all', 'read', 'minimal_all', 'minimal_read'],
            infrastructure: ['all', 'read', 'minimal_all', 'minimal_read'],
            logs: ['all', 'read', 'minimal_all', 'minimal_read'],
            uptime: ['all', 'read', 'minimal_all', 'minimal_read'],
            apm: ['all', 'read', 'minimal_all', 'minimal_read'],
            osquery: ['all', 'read', 'minimal_all', 'minimal_read'],
            ml: ['all', 'read', 'minimal_all', 'minimal_read'],
            siem: ['all', 'read', 'minimal_all', 'minimal_read'],
            securitySolutionCases: ['all', 'read', 'minimal_all', 'minimal_read'],
            fleetv2: ['all', 'read', 'minimal_all', 'minimal_read'],
            fleet: ['all', 'read', 'minimal_all', 'minimal_read'],
            stackAlerts: ['all', 'read', 'minimal_all', 'minimal_read'],
            actions: ['all', 'read', 'minimal_all', 'minimal_read'],
          },
          global: ['all', 'read'],
          space: ['all', 'read'],
          reserved: ['fleet-setup', 'ml_user', 'ml_admin', 'ml_apm_user', 'monitoring'],
        };

        await supertest
          .get('/api/security/privileges')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .expect((res: any) => {
            // when comparing privileges, the order of the privileges doesn't matter.
            // supertest uses assert.deepStrictEqual.
            // expect.js doesn't help us here.
            // and lodash's isEqual doesn't know how to compare Sets.
            const success = isEqualWith(res.body, expected, (value, other, key) => {
              if (Array.isArray(value) && Array.isArray(other)) {
                return isEqual(value.sort(), other.sort());
              }

              // Lodash types aren't correct, `undefined` should be supported as a return value here and it
              // has special meaning.
              return undefined as any;
            });

            if (!success) {
              throw new Error(
                `Expected ${util.inspect(res.body)} to equal ${util.inspect(expected)}`
              );
            }
          })
          .expect(200);
      });
    });
  });
}
