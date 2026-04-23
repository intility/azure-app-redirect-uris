import 'isomorphic-fetch';
import { DefaultAzureCredential } from '@azure/identity';
import { Client, GraphError } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Command, Argument } from 'commander';
import { version, description } from './package.json';

const program = new Command();

program
  .name('npx @intility/azure-app-redirect-uris')
  .description(description)
  .version(version)
  .argument('<appObjectId>', 'The object ID of the app registration')
  .addArgument(
    new Argument('<platform>', 'Redirect URI platform').choices([
      'publicClient',
      'web',
      'spa',
    ]),
  )
  .addArgument(
    new Argument('<action>', 'The action to perform').choices([
      'add',
      'remove',
    ]),
  )
  .argument('<redirectUri>', 'The redirect URI')
  .action(
    async (
      appObjectId: string,
      platform: 'publicClient' | 'web' | 'spa',
      action: 'add' | 'remove',
      redirectUri: 'string',
    ) => {
      try {
        const credential = new DefaultAzureCredential();

        const authProvider = new TokenCredentialAuthenticationProvider(
          credential,
          {
            scopes: ['https://graph.microsoft.com/.default'],
          },
        );
        const client = Client.initWithMiddleware({ authProvider });

        const app = await client.api(`/applications/${appObjectId}`).get();

        const redirectUris = new Set<string>(app[platform].redirectUris);

        // store message in a variable to be able to print it after success
        let message: string | undefined;

        if (action === 'add') {
          if (redirectUris.has(redirectUri)) {
            console.log(
              `Redirect URI ${redirectUri} is already registered, doing nothing.`,
            );
            return;
          }

          message = `Redirect URI ${redirectUri} successfully added.`;
          redirectUris.add(redirectUri);
        }

        if (action === 'remove') {
          if (!redirectUris.has(redirectUri)) {
            console.log(
              `Redirect URI ${redirectUri} not registered, doing nothing.`,
            );
            return;
          }

          message = `Redirect URI ${redirectUri} successfully removed.`;
          redirectUris.delete(redirectUri);
        }

        await client.api(`/applications/${appObjectId}`).patch({
          [platform]: { ...app[platform], redirectUris: [...redirectUris] },
        });

        if (message) {
          console.log(message);
        }
      } catch (e) {
        if (e instanceof GraphError) {
          console.error(e.message);
          return;
        }

        throw e;
      }
    },
  );

program.parse();
