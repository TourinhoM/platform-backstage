import React from 'react';
import { createApp } from '@backstage/frontend-defaults';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
import appPlugin from '@backstage/plugin-app';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { navModule } from './modules/nav';

const githubProvider = {
  id: 'github-auth-provider',
  title: 'GitHub',
  message: 'Sign in with GitHub',
  apiRef: githubAuthApiRef,
};

const appModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    appPlugin.getExtension('sign-in-page:app').override({
      factory() {
        return [
          SignInPageBlueprint.dataRefs.component(
            props => <SignInPage {...props} providers={['guest', githubProvider]} />,
          ),
        ];
      },
    }),
  ],
});

export default createApp({
  features: [appModule, catalogPlugin, githubActionsPlugin, navModule],
});
