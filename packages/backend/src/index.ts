import { createBackend } from '@backstage/backend-defaults';
import { rootHttpRouterServiceFactory } from '@backstage/backend-defaults/rootHttpRouter';

const backend = createBackend();

// node-fetch v2 (cliente HTTP interno do catalog) NÃO descomprime gzip no Node 22
// (ERR_STREAM_PREMATURE_CLOSE no Gunzip) -> leituras internas de entidade falham
// e o scaffolder (parameter-schema) + o indexador de search dão 500. Node 22 é
// obrigatório (isolated-vm 6.x não compila no Node 20), então desligamos só a
// compressão de RESPOSTA: replicamos a cadeia default do rootHttpRouter sem o
// middleware.compression(). O resto (helmet/cors/logging/rateLimit/health/erros)
// é idêntico ao default. (backend.server.* não está no app-config, então não há
// trustProxy/timeouts custom a preservar aqui.)
backend.add(
  rootHttpRouterServiceFactory({
    configure({ app, middleware, routes, healthRouter }) {
      app.use(middleware.helmet());
      app.use(middleware.cors());
      // compression() omitido de propósito — ver comentário acima
      app.use(middleware.logging());
      app.use(middleware.rateLimit());
      app.use(healthRouter);
      app.use(routes);
      app.use(middleware.notFound());
      app.use(middleware.error());
    },
  }),
);

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
// utils da Roadie (fs/merge/parse): edição de arquivo em repo existente —
// day-2 editando o gitops repo direto (B′ do workload experiment), sem
// dispatch de CI e sem PR (form = aprovação; admission do XRD = gate).
backend.add(import('@roadiehq/scaffolder-backend-module-utils'));

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
