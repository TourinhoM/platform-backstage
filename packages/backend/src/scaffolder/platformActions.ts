/*
 * Actions custom da plataforma pro scaffolder.
 *
 * platform:github:commit — commit de arquivos do workspace DIRETO numa
 * branch existente, preservando história. É o Lego que o OSS não tem:
 * github:repo:push só semeia repo de história vazia (git init órfão →
 * non-fast-forward em repo vivo) e publish:github:pull-request exige PR.
 * Day-2 self-service sem PR (form = aprovação) precisa disto.
 *
 * Implementação via GraphQL createCommitOnBranch (sem git binário, sem
 * isomorphic-git): o expectedHeadOid dá concorrência otimista — se outro
 * escritor (ex.: promoção de tag do ci-tag) commitar no meio, a mutation
 * falha limpo em vez de sobrescrever.
 */
import {
  coreServices,
  createBackendModule,
  resolveSafeChildPath,
} from '@backstage/backend-plugin-api';
import {
  createTemplateAction,
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';
import {
  DefaultGithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import fs from 'fs/promises';

function parseRepoUrl(repoUrl: string): {
  host: string;
  owner: string;
  repo: string;
} {
  const [host, query] = repoUrl.split('?');
  const params = new URLSearchParams(query);
  const owner = params.get('owner');
  const repo = params.get('repo');
  if (!owner || !repo) {
    throw new Error(
      `repoUrl inválida: "${repoUrl}" (esperado github.com?owner=X&repo=Y)`,
    );
  }
  return { host, owner, repo };
}

async function githubGraphql(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<any> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    throw new Error(
      `GitHub GraphQL falhou: ${JSON.stringify(body.errors ?? body)}`,
    );
  }
  return body.data;
}

export default createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'platform-actions',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, config }) {
        const integrations = ScmIntegrations.fromConfig(config);
        const credentialsProvider =
          DefaultGithubCredentialsProvider.fromIntegrations(integrations);

        scaffolder.addActions(
          createTemplateAction({
            id: 'platform:github:commit',
            description:
              'Commit de arquivos do workspace direto numa branch existente (história preservada, concorrência otimista).',
            schema: {
              input: {
                repoUrl: z =>
                  z.string().describe('github.com?owner=<org>&repo=<nome>'),
                branch: z =>
                  z.string().default('main').describe('Branch alvo'),
                message: z => z.string().describe('Mensagem de commit'),
                files: z =>
                  z
                    .array(z.string())
                    .describe('Arquivos do workspace a commitar (relativos)'),
              },
              output: {
                commitUrl: z => z.string(),
                commitOid: z => z.string(),
              },
            },
            async handler(ctx) {
              const { repoUrl, message, files, branch } = ctx.input;
              const { owner, repo } = parseRepoUrl(repoUrl);

              const { token } = await credentialsProvider.getCredentials({
                url: `https://github.com/${owner}/${repo}`,
              });
              if (!token) {
                throw new Error(
                  `Sem credencial GitHub configurada pra ${owner}/${repo}`,
                );
              }

              // Head atual da branch — vira o expectedHeadOid da mutation.
              const head = await githubGraphql(
                token,
                `query($owner:String!,$repo:String!,$ref:String!){
                  repository(owner:$owner,name:$repo){ ref(qualifiedName:$ref){ target { oid } } }
                }`,
                { owner, repo, ref: `refs/heads/${branch}` },
              );
              const expectedHeadOid = head.repository?.ref?.target?.oid;
              if (!expectedHeadOid) {
                throw new Error(
                  `Branch "${branch}" não existe em ${owner}/${repo}`,
                );
              }

              const additions = await Promise.all(
                files.map(async path => ({
                  path,
                  contents: (
                    await fs.readFile(
                      resolveSafeChildPath(ctx.workspacePath, path),
                    )
                  ).toString('base64'),
                })),
              );

              const result = await githubGraphql(
                token,
                `mutation($input:CreateCommitOnBranchInput!){
                  createCommitOnBranch(input:$input){ commit { oid url } }
                }`,
                {
                  input: {
                    branch: {
                      repositoryNameWithOwner: `${owner}/${repo}`,
                      branchName: branch,
                    },
                    expectedHeadOid,
                    message: { headline: message },
                    fileChanges: { additions },
                  },
                },
              );

              const commit = result.createCommitOnBranch.commit;
              ctx.logger.info(
                `Commit ${commit.oid} em ${owner}/${repo}@${branch}`,
              );
              ctx.output('commitUrl', commit.url);
              ctx.output('commitOid', commit.oid);
            },
          }),
        );
      },
    });
  },
});
