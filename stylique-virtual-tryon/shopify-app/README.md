# Stylique Shopify Theme App Extension

This Shopify CLI wrapper deploys the Stylique Theme App Extension for the same Shopify Partner app used by the backend OAuth flow.

## Setup

1. Install dependencies with `npm install`.
2. Copy `shopify.app.toml.example` to `shopify.app.toml`.
3. Set `client_id` to the Shopify app API key used by the backend `SHOPIFY_API_KEY`.
4. Confirm the app redirect URL points to the deployed backend callback.
5. Run `npm run dev` to preview on a development store.
6. Run `npm run deploy` to deploy the extension.

The current manual Liquid section remains available as a fallback during rollout.
