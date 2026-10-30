#!/usr/bin/env node
import { setTimeout } from 'node:timers/promises';
import { DefaultAzureCredential } from '@azure/identity';
import { Command, Argument } from 'commander';
import { version, description } from './package.json';

type Platform = 'publicClient' | 'web' | 'spa';
type Application = Record<Platform, { redirectUris: Array<string> }>;

class GraphError extends Error {}

// Statuses Graph uses for throttling and transient failures.
const RETRYABLE_STATUSES = new Set([429, 503, 504]);
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_SECONDS = 60;

async function graphRequest<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  let response: Response;
  for (let attempt = 0; ; attempt++) {
    response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      ...init,
      headers,
    });

    if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_RETRIES) {
      break;
    }

    // Retry-After is in seconds; fall back to exponential backoff (1s, 2s, 4s).
    const retryAfter = Number(response.headers.get('Retry-After'));
    const delaySeconds = retryAfter > 0 ? retryAfter : 2 ** attempt;
    await response.body?.cancel();
    await setTimeout(Math.min(delaySeconds, MAX_RETRY_DELAY_SECONDS) * 1000);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | { error?: { message?: string } }
      | undefined;
    throw new GraphError(
      body?.error?.message ?? `${response.status} ${response.statusText}`,
    );
  }

  // PATCH returns 204 No Content.
  return (response.status === 204 ? undefined : await response.json()) as T;
}

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
      platform: Platform,
      action: 'add' | 'remove',
      redirectUris: Array<string>,
    ) => {
      try {
        const credential = new DefaultAzureCredential();
        const accessToken = await credential.getToken(
          'https://graph.microsoft.com/.default',
        );
        if (!accessToken) {
          throw new Error('Failed to get an access token for Microsoft Graph.');
        }

        const appPath = `/applications/${encodeURIComponent(appObjectId)}`;
        const app = await graphRequest<Application>(accessToken.token, appPath);

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

        await graphRequest(accessToken.token, appPath, {
          method: 'PATCH',
          body: JSON.stringify({
            [platform]: {
              ...app[platform],
              redirectUris: [...appRedirectUris],
            },
          }),
        });

        messages.forEach((message) => console.log(message));
      } catch (e) {
        if (e instanceof GraphError) {
          console.error(e.message);
          process.exitCode = 1;
          return;
        }

        throw e;
      }
    },
  );

await program.parseAsync();
