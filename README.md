# Open CryptoPay client tests

Tests for the Open CryptoPay API at [dev.api.dfx.swiss](https://dev.api.dfx.swiss) (DEV default). Production remains available via `OCP_BASE_URL`.

Protocol description: [opencryptopay.io](https://opencryptopay.io) · [openCryptoPay/landingPage](https://github.com/openCryptoPay/landingPage)

## Run

Requires Node.js 22+.

```bash
npm test
```

No install step — there are no npm dependencies.

The suite creates 0.01 CHF invoices on the configured route and cancels them in `finally`. It never cancels the demo link `pl_beeddb41cd4b6d9e`.

## Environment

| Variable         | Default                              | Meaning                                      |
|------------------|--------------------------------------|----------------------------------------------|
| `OCP_BASE_URL`   | `https://dev.api.dfx.swiss/v1`       | API base URL (no trailing slash); override for prod |
| `OCP_LINK_ID`    | `pl_beeddb41cd4b6d9e`                | Persistent Test Shop demo link on DEV (often no pending payment — pending tests do not rely on it) |
| `OCP_ROUTE`      | `SPAR` when BASE includes `dev.api.dfx.swiss`, else `DFX VM 01` | Route for public invoice create (`/paymentLink/payment` and compact `/plp`) and recipient lookup |
| `OCP_ACCESS_KEY` | *(empty)*                            | Optional POS access key; empty skips POS create/cancel |
| `OCP_POS_LINK_ID` | *(empty)*                           | Payment link for POS create/cancel (not the demo link) |

## Scope

Coverage (default `npm test` covers the full **unauthenticated** Open CryptoPay HTTP surface):

- LNURL encode/decode
- payment standards list, per-id detail, unknown id 404
- wallet apps list, recommended, every listed app by id, unknown id 404, `blockchain` / `active` query filters
- paymentLink recipient lookup (via `OCP_ROUTE`), missing id, unknown id
- unauthenticated merchant routes (401/403 and public locations), including remaining paymentLink auth walls
- locations filtered by `publicName` (200 + array; empty list is OK on DEV)
- full pay-request schema on a **created** invoice (including every transferAmounts entry)
- POST `/lnurlp/{id}` without amount is 400
- a callback GET for every **available** method×asset pair on one created invoice (BinancePay asserts 200+uri or 503 when advertised; skips only if BinancePay is not advertised)
- callback quote-only Lightning default, missing asset, unknown quote, unavailable methods — all on the same created invoice
- `/lnurlp/tx` rejects a missing quote, missing hex/tx/sender, and invalid hex (quote/hex cases use a created invoice)
- `/lnurlp/wait` unknown id 404; pending wait aborts via client timeout on a created invoice
- public invoice create/cancel (never the demo link), pending wait abort, after-cancel wait 404, and compact `/plp`
- `PUT /paymentLink/assign` empty body and publicName-only validation
- `DELETE /lnurlp/cancel` unknown id 404
- unauthenticated `POST /paymentLink/payment` (missing amount 400, no credentials 404)
- LNURL sibling routes (`/lnurlw`, `/lnurld`, `/lnurla`, `/lnurla/status`)
- optional POS payment create/cancel when `OCP_ACCESS_KEY` and `OCP_POS_LINK_ID` are set

Out of scope: completing a real on-chain payment (would spend money). Cancel of the **demo** link remains out of scope; only invoices this suite created are cancelled. Unknown-id cancel 404 is in scope. Never send a valid signed tx. POS create/cancel stays optional behind `OCP_ACCESS_KEY` + `OCP_POS_LINK_ID`.

## License

MIT
