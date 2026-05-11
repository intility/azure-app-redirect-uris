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
  .argument('<redirectUris...>', 'The redirect URIs')
  .action(
    async (
      appObjectId: string,
      platform: 'publicClient' | 'web' | 'spa',
      action: 'add' | 'remove',
      redirectUris: Array<string>,
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

        const appRedirectUris = new Set<string>(app[platform].redirectUris);
        const uniqueUris = new Set(redirectUris);

        // store messages in an array to be able to print it after success
        const messages: Array<string> = [];

        for (const redirectUri of uniqueUris) {
          if (action === 'add') {
            if (appRedirectUris.has(redirectUri)) {
              console.log(
                `Redirect URI ${redirectUri} is already registered, doing nothing.`,
              );
              continue;
            }

            messages.push(`Redirect URI ${redirectUri} successfully added.`);
            appRedirectUris.add(redirectUri);
          }

          if (action === 'remove') {
            if (!appRedirectUris.has(redirectUri)) {
              console.log(
                `Redirect URI ${redirectUri} not registered, doing nothing.`,
              );
              continue;
            }

            messages.push(`Redirect URI ${redirectUri} successfully removed.`);
            appRedirectUris.delete(redirectUri);
          }
        }

        if (messages.length === 0) return;

        await client.api(`/applications/${appObjectId}`).patch({
          [platform]: { ...app[platform], redirectUris: [...appRedirectUris] },
        });

        messages.forEach((message) => console.log(message));
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
