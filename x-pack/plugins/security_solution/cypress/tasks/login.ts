/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as yaml from 'js-yaml';
import Url, { UrlObject } from 'url';

import { ROLES } from '../../common/test';
import { RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY } from '../../common/constants';
import { TIMELINE_FLYOUT_BODY } from '../screens/timeline';
import { hostDetailsUrl, LOGOUT_URL, userDetailsUrl } from '../urls/navigation';

/**
 * Credentials in the `kibana.dev.yml` config file will be used to authenticate
 * with Kibana when credentials are not provided via environment variables
 */
const KIBANA_DEV_YML_PATH = '../../../config/kibana.dev.yml';

/**
 * The configuration path in `kibana.dev.yml` to the username to be used when
 * authenticating with Kibana.
 */
const ELASTICSEARCH_USERNAME_CONFIG_PATH = 'config.elasticsearch.username';

/**
 * The configuration path in `kibana.dev.yml` to the password to be used when
 * authenticating with Kibana.
 */
const ELASTICSEARCH_PASSWORD_CONFIG_PATH = 'config.elasticsearch.password';

/**
 * The `CYPRESS_ELASTICSEARCH_USERNAME` environment variable specifies the
 * username to be used when authenticating with Kibana
 */
const ELASTICSEARCH_USERNAME = 'ELASTICSEARCH_USERNAME';

/**
 * The `CYPRESS_ELASTICSEARCH_PASSWORD` environment variable specifies the
 * username to be used when authenticating with Kibana
 */
const ELASTICSEARCH_PASSWORD = 'ELASTICSEARCH_PASSWORD';

/**
 * The Kibana server endpoint used for authentication
 */
const LOGIN_API_ENDPOINT = '/internal/security/login';

/**
 * cy.visit will default to the baseUrl which uses the default kibana test user
 * This function will override that functionality in cy.visit by building the baseUrl
 * directly from the environment variables set up in x-pack/test/security_solution_cypress/runner.ts
 *
 * @param role string role/user to log in with
 * @param route string route to visit
 */
export const getUrlWithRoute = (role: ROLES, route: string) => {
  const url = Cypress.config().baseUrl;
  const kibana = new URL(String(url));
  const theUrl = `${Url.format({
    auth: `${role}:changeme`,
    username: role,
    password: 'changeme',
    protocol: kibana.protocol.replace(':', ''),
    hostname: kibana.hostname,
    port: kibana.port,
  } as UrlObject)}${route.startsWith('/') ? '' : '/'}${route}`;
  cy.log(`origin: ${theUrl}`);
  return theUrl;
};

interface User {
  username: string;
  password: string;
}

/**
 * Builds a URL with basic auth using the passed in user.
 *
 * @param user the user information to build the basic auth with
 * @param route string route to visit
 */
export const constructUrlWithUser = (user: User, route: string) => {
  const url = Cypress.config().baseUrl;
  const kibana = new URL(String(url));
  const hostname = kibana.hostname;
  const username = user.username;
  const password = user.password;
  const protocol = kibana.protocol.replace(':', '');
  const port = kibana.port;

  const path = `${route.startsWith('/') ? '' : '/'}${route}`;
  const strUrl = `${protocol}://${username}:${password}@${hostname}:${port}${path}`;
  const builtUrl = new URL(strUrl);

  cy.log(`origin: ${builtUrl.href}`);
  return builtUrl.href;
};

export const getCurlScriptEnvVars = () => ({
  ELASTICSEARCH_URL: Cypress.env('ELASTICSEARCH_URL'),
  ELASTICSEARCH_USERNAME: Cypress.env('ELASTICSEARCH_USERNAME'),
  ELASTICSEARCH_PASSWORD: Cypress.env('ELASTICSEARCH_PASSWORD'),
  KIBANA_URL: Cypress.config().baseUrl,
});

export const postRoleAndUser = (role: ROLES) => {
  const env = getCurlScriptEnvVars();
  const detectionsRoleScriptPath = `./server/lib/detection_engine/scripts/roles_users/${role}/post_detections_role.sh`;
  const detectionsRoleJsonPath = `./server/lib/detection_engine/scripts/roles_users/${role}/detections_role.json`;
  const detectionsUserScriptPath = `./server/lib/detection_engine/scripts/roles_users/${role}/post_detections_user.sh`;
  const detectionsUserJsonPath = `./server/lib/detection_engine/scripts/roles_users/${role}/detections_user.json`;

  // post the role
  cy.exec(`bash ${detectionsRoleScriptPath} ${detectionsRoleJsonPath}`, {
    env,
  });

  // post the user associated with the role to elasticsearch
  cy.exec(`bash ${detectionsUserScriptPath} ${detectionsUserJsonPath}`, {
    env,
  });
};

export const deleteRoleAndUser = (role: ROLES) => {
  const env = getCurlScriptEnvVars();
  const detectionsUserDeleteScriptPath = `./server/lib/detection_engine/scripts/roles_users/${role}/delete_detections_user.sh`;

  // delete the role
  cy.exec(`bash ${detectionsUserDeleteScriptPath}`, {
    env,
  });
};

export const loginWithUser = (user: User) => {
  cy.request({
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: {
        username: user.username,
        password: user.password,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    method: 'POST',
    url: constructUrlWithUser(user, LOGIN_API_ENDPOINT),
  });
};

export const loginWithRole = async (role: ROLES) => {
  postRoleAndUser(role);
  const theUrl = Url.format({
    auth: `${role}:changeme`,
    username: role,
    password: 'changeme',
    protocol: Cypress.env('protocol'),
    hostname: Cypress.env('hostname'),
    port: Cypress.env('configport'),
  } as UrlObject);
  cy.log(`origin: ${theUrl}`);
  cy.request({
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: {
        username: role,
        password: 'changeme',
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    method: 'POST',
    url: getUrlWithRoute(role, LOGIN_API_ENDPOINT),
  });
};

/**
 * Authenticates with Kibana using, if specified, credentials specified by
 * environment variables. The credentials in `kibana.dev.yml` will be used
 * for authentication when the environment variables are unset.
 *
 * To speed the execution of tests, prefer this non-interactive authentication,
 * which is faster than authentication via Kibana's interactive login page.
 */
export const login = (role?: ROLES) => {
  if (role != null) {
    loginWithRole(role);
  } else if (credentialsProvidedByEnvironment()) {
    loginViaEnvironmentCredentials();
  } else {
    loginViaConfig();
  }
};

/**
 * Returns `true` if the credentials used to login to Kibana are provided
 * via environment variables
 */
const credentialsProvidedByEnvironment = (): boolean =>
  Cypress.env(ELASTICSEARCH_USERNAME) != null && Cypress.env(ELASTICSEARCH_PASSWORD) != null;

/**
 * Authenticates with Kibana by reading credentials from the
 * `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
 * environment variables, and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaEnvironmentCredentials = () => {
  cy.log(
    `Authenticating via environment credentials from the \`CYPRESS_${ELASTICSEARCH_USERNAME}\` and \`CYPRESS_${ELASTICSEARCH_PASSWORD}\` environment variables`
  );

  // programmatically authenticate without interacting with the Kibana login page
  cy.request({
    body: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: {
        username: Cypress.env(ELASTICSEARCH_USERNAME),
        password: Cypress.env(ELASTICSEARCH_PASSWORD),
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-env' },
    method: 'POST',
    url: `${Cypress.config().baseUrl}${LOGIN_API_ENDPOINT}`,
  });
};

/**
 * Authenticates with Kibana by reading credentials from the
 * `kibana.dev.yml` file and POSTing the username and password directly to
 * Kibana's `/internal/security/login` endpoint, bypassing the login page (for speed).
 */
const loginViaConfig = () => {
  cy.log(
    `Authenticating via config credentials \`${ELASTICSEARCH_USERNAME_CONFIG_PATH}\` and \`${ELASTICSEARCH_PASSWORD_CONFIG_PATH}\` from \`${KIBANA_DEV_YML_PATH}\``
  );

  // read the login details from `kibana.dev.yaml`
  cy.readFile(KIBANA_DEV_YML_PATH).then((kibanaDevYml) => {
    const config = yaml.safeLoad(kibanaDevYml);

    // programmatically authenticate without interacting with the Kibana login page
    cy.request({
      body: {
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: {
          username: config.elasticsearch.username,
          password: config.elasticsearch.password,
        },
      },
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      method: 'POST',
      url: `${Cypress.config().baseUrl}${LOGIN_API_ENDPOINT}`,
    });
  });
};

/**
 * Get the configured auth details that were used to spawn cypress
 *
 * @returns the default Elasticsearch username and password for this environment
 */
export const getEnvAuth = (): User => {
  if (credentialsProvidedByEnvironment()) {
    return {
      username: Cypress.env(ELASTICSEARCH_USERNAME),
      password: Cypress.env(ELASTICSEARCH_PASSWORD),
    };
  } else {
    let user: User = { username: '', password: '' };
    cy.readFile(KIBANA_DEV_YML_PATH).then((devYml) => {
      const config = yaml.safeLoad(devYml);
      user = { username: config.elasticsearch.username, password: config.elasticsearch.password };
    });

    return user;
  }
};

/**
 * Saves in localStorage rules feature tour config with deactivated option
 * It prevents tour to appear during tests and cover UI elements
 * @param window - browser's window object
 */
const disableRulesFeatureTour = (window: Window) => {
  const tourConfig = {
    isTourActive: false,
  };
  window.localStorage.setItem(
    RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY,
    JSON.stringify(tourConfig)
  );
};

/**
 * Authenticates with Kibana, visits the specified `url`, and waits for the
 * Kibana global nav to be displayed before continuing
 */
export const loginAndWaitForPage = (
  url: string,
  role?: ROLES,
  onBeforeLoadCallback?: (win: Cypress.AUTWindow) => void
) => {
  login(role);
  cy.visit(
    `${url}?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:'2019-01-19T16:22:56.217Z',kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:'2019-01-19T16:22:56.217Z',kind:relative,to:1579537385745,toStr:now)))`,
    {
      onBeforeLoad(win) {
        if (onBeforeLoadCallback) {
          onBeforeLoadCallback(win);
        }
        disableRulesFeatureTour(win);
      },
    }
  );
  cy.get('[data-test-subj="headerGlobalNav"]');
};
export const waitForPage = (url: string) => {
  cy.visit(
    `${url}?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:'2019-01-19T16:22:56.217Z',kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:'2019-01-19T16:22:56.217Z',kind:relative,to:1579537385745,toStr:now)))`
  );
  cy.get('[data-test-subj="headerGlobalNav"]');
};

export const loginAndWaitForPageWithoutDateRange = (url: string, role?: ROLES) => {
  login(role);
  cy.visit(role ? getUrlWithRoute(role, url) : url, {
    onBeforeLoad: disableRulesFeatureTour,
  });
  cy.get('[data-test-subj="headerGlobalNav"]', { timeout: 120000 });
};

export const loginWithUserAndWaitForPageWithoutDateRange = (url: string, user: User) => {
  loginWithUser(user);
  cy.visit(constructUrlWithUser(user, url), {
    onBeforeLoad: disableRulesFeatureTour,
  });
  cy.get('[data-test-subj="headerGlobalNav"]', { timeout: 120000 });
};

export const loginAndWaitForTimeline = (timelineId: string, role?: ROLES) => {
  const route = `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`;

  login(role);
  cy.visit(role ? getUrlWithRoute(role, route) : route, {
    onBeforeLoad: disableRulesFeatureTour,
  });
  cy.get('[data-test-subj="headerGlobalNav"]');
  cy.get(TIMELINE_FLYOUT_BODY).should('be.visible');
};

export const loginAndWaitForHostDetailsPage = (hostName = 'suricata-iowa') => {
  loginAndWaitForPage(hostDetailsUrl(hostName));
  cy.get('[data-test-subj="loading-spinner"]', { timeout: 12000 }).should('not.exist');
};

export const loginAndWaitForUsersDetailsPage = (userName = 'bob') => {
  loginAndWaitForPage(userDetailsUrl(userName));
  cy.get('[data-test-subj="loading-spinner"]', { timeout: 12000 }).should('not.exist');
};

export const waitForPageWithoutDateRange = (url: string, role?: ROLES) => {
  cy.visit(role ? getUrlWithRoute(role, url) : url);
  cy.get('[data-test-subj="headerGlobalNav"]', { timeout: 120000 });
};

export const logout = () => {
  cy.visit(LOGOUT_URL);
};
