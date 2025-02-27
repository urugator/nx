import { assertTextOnPage } from './helpers';

/**
 * Asserting all the additional API references pages are accounted for and accessible.
 * Generation of the pages is manual since we want to make sure the change is intended.
 */
describe('nx-dev: Nx Cloud section', () => {
  (<{ title: string; path: string }[]>[
    { title: 'What is Nx Cloud?', path: '/nx-cloud/intro/what-is-nx-cloud' },
    {
      title: 'Enabling Distributed Caching',
      path: '/nx-cloud/set-up/set-up-caching',
    },
    {
      title: 'Set Up Distributed Task Execution',
      path: '/nx-cloud/set-up/set-up-dte',
    },
    {
      title: 'Recording Non-Nx Commands',
      path: '/nx-cloud/set-up/record-commands',
    },
    {
      title: 'Enable Github PR Integration',
      path: '/nx-cloud/set-up/github',
    },
    {
      title: 'Billing and Utilization',
      path: '/nx-cloud/account/billing',
    },
    {
      title: 'User Management',
      path: '/nx-cloud/account/users',
    },
    {
      title: 'Connecting Nx Cloud to your existing Google identity provider',
      path: '/nx-cloud/account/google-auth',
    },
    {
      title: 'Access Tokens',
      path: '/nx-cloud/account/access-tokens',
    },
    {
      title: 'Security Scenarios',
      path: '/nx-cloud/account/scenarios',
    },
    {
      title: 'End to End Encryption',
      path: '/nx-cloud/account/encryption',
    },
    {
      title: 'Running Nx Cloud on Prem',
      path: '/nx-cloud/private-cloud/get-started',
    },
    {
      title: 'GitHub PR Integration',
      path: '/nx-cloud/private-cloud/github',
    },
    {
      title: 'Auth (Basic)',
      path: '/nx-cloud/private-cloud/auth-single-admin',
    },
    {
      title: 'GitHub Auth',
      path: '/nx-cloud/private-cloud/auth-github',
    },
    {
      title: 'GitLab Auth',
      path: '/nx-cloud/private-cloud/auth-gitlab',
    },
    {
      title: 'BitBucket Auth',
      path: '/nx-cloud/private-cloud/auth-bitbucket',
    },
    {
      title: 'SAML Auth',
      path: '/nx-cloud/private-cloud/auth-saml',
    },
    {
      title: 'Advanced Configuration',
      path: '/nx-cloud/private-cloud/advanced-config',
    },
    {
      title: 'Configuring the Cloud Runner / Nx CLI',
      path: '/nx-cloud/reference/config',
    },
    {
      title: 'Environment Variables',
      path: '/nx-cloud/reference/env-vars',
    },
    {
      title: 'Nx Cloud Server API Reference',
      path: '/nx-cloud/reference/server-api',
    },
    {
      title: '@nrwl/nx-cloud - Release notes',
      path: '/nx-cloud/reference/release-notes',
    },
  ]).forEach((page) => assertTextOnPage(page.path, page.title));
});
