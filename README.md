<h1 align="center">
  <img src="https://avatars.githubusercontent.com/u/35199565" width="124px"/><br/>
  @intility/azure-app-redirect-uris
</h1>

<p align="center">
  CLI to add and remove redirect uris from an Azure App Registration.
  <br />
  Useful for CI/CD pipelines using branch/review deployments.
</p>

<p align="center">
  <a href="https://github.com/Intility/azure-app-redirect-uris/actions">
    <img alt="pipeline" src="https://github.com/Intility/azure-app-redirect-uris/actions/workflows/publish.yml/badge.svg" style="max-width:100%;" />
  </a>
  <a href="https://www.npmjs.com/package/@intility/azure-app-redirect-uris">
    <img alt="package version" src="https://img.shields.io/npm/v/@intility/azure-app-redirect-uris?label=%40intility%2Fazure-app-redirect-uris" style="max-width:100%;" />
  </a>
</p>

## Usage

```
Usage: npx @intility/azure-app-redirect-uris [options] <appObjectId> <platform> <action> <redirectUris...>

CLI to add and remove redirect uris from an Azure App Registration.

Arguments:
  appObjectId    The object ID of the app registration
  platform       Redirect URI platform (choices: "publicClient", "web", "spa")
  action         The action to perform (choices: "add", "remove")
  redirectUris   The redirect URIs

Options:
  -V, --version  output the version number
  -h, --help     display help for command
```

The command uses [`DefaultAzureCredential` from `@azure/identity`](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/identity/identity/README.md#defaultazurecredential) to authenticate.

If authenticating using a Service Principal (clientId & clientSecret/clientCertificate), the app needs the `Application.ReadWrite.OwnedBy` permission (and be owner of the application you want to modify), or `Application.ReadWrite.All`.

## Granting the CI/CD agent ownership of your app registration

For the review-branch workflow to manage redirect URIs on your app registration (e.g. your Swagger app), your department's **CI/CD agent** must be an *owner* of that app registration. The agent uses the `Application.ReadWrite.OwnedBy` Graph permission, which only allows it to modify app registrations it owns.

> ⚠️ The Entra ID portal only supports adding **users** as owners — a service
> principal cannot be added through the UI. You must do it via the Microsoft
> Graph API, e.g. with `az rest` (requires Azure CLI and that you are an owner
> of the app registration, or have an admin role).

Run the following, replacing:
- `<YOUR-APP-OBJECT-ID>` — the **Object ID** of your app registration, found on
  the app's *Overview* page in Entra ID (the Object ID, **not** the
  Application/Client ID)
- `<CICD-AGENT-SP-OBJECT-ID>` — the **service principal** (enterprise
  application) Object ID of your CI/CD agent. Note: this must be the service
  principal's Object ID, **not** the agent's app registration Object ID — Graph
  requires the service principal here.

```bash
az rest --method POST \ 
  --uri "https://graph.microsoft.com/v1.0/applications/<YOUR-APP-OBJECT-ID>/owners/\$ref" \
  --headers "Content-Type=application/json" \
  --body '{"@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/<CICD-AGENT-SP-OBJECT-ID>"}'
  ``` 
A successful call returns no output, and the agent will appear under the app registration's *Owners* in the portal.

### As a GitLab job

```yaml
# Run after deployment
verify:azure:
  image: node:lts
  variables:
    APP_OBJECT_ID: 00000000-0000-0000-0000-000000000000
    URL: http://localhost:3000
    # These variables should be defined in CI/CD settings
    # AZURE_TENANT_ID:
    # AZURE_CLIENT_ID:
    # AZURE_CLIENT_SECRET:
  script:
    - npx @intility/azure-app-redirect-uris $APP_OBJECT_ID spa add $URL

# Run after deployment takedown
stop:azure:
  image: node:lts
  variables:
    APP_OBJECT_ID: 00000000-0000-0000-0000-000000000000
    URL: http://localhost:3000
    # These variables should be defined in CI/CD settings
    # AZURE_TENANT_ID:
    # AZURE_CLIENT_ID:
    # AZURE_CLIENT_SECRET:
  script:
    - npx @intility/azure-app-redirect-uris $APP_OBJECT_ID spa remove $URL
```

## Contributing

To build this project, you can run this command:

```
npm run build
```

Also, you can use `npm run watch` to build on file changes.

Run `node bin/cli.js [arguments/options]` to test the command after compilation.

This project was created with [create-typescript-cli](https://github.com/backrunner/create-typescript-cli).
