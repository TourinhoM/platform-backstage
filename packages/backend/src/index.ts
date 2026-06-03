import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// auth
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

// catalog
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-github'));
backend.add(import('@backstage/plugin-catalog-backend-module-github-org'));

// scaffolder
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));

// argocd
backend.add(import('@roadiehq/backstage-plugin-argo-cd-backend'));

// kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

// techdocs
backend.add(import('@backstage/plugin-techdocs-backend'));

// kyverno (policy reports via Policy Reporter REST API)
backend.add(import('@kyverno/backstage-plugin-policy-reporter-backend'));

// permissions
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));

// search
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));

backend.start();
