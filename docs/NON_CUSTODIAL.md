# Why non-custodial, specifically

Every write to the `ticketing` contract requires `require_auth()` from
the account taking the action — the contract has no concept of an
admin override for ticket ownership. That means the only way this API
could act on a user's behalf is by holding their private key, which
would make StellarTickets a single point of failure for every ticket
on the platform.

Instead, `StellarService.build*Tx` methods return unsigned XDR built
against the caller's own public key, and the caller's wallet signs it.
The API only ever submits transactions someone else already signed.
`PLATFORM_SIGNER_SECRET` exists only for read-only simulations
(`verify_ticket`, `get_event`), which don't call `require_auth` at
all — see `src/stellar/stellar.service.ts`.

## The platform signer's role

The platform signer (`PLATFORM_SIGNER_SECRET`) is a disposable hot
wallet with one job: it is the source account for read-only contract
simulations. It signs nothing.

- **Signs:** no operation. The API never signs a transaction with it.
- **Used for:** `verifyTicket` and `getEvent` simulations, which need a
  source account but never call `require_auth`.
- **Never used for:** any write (`build*Tx` methods build for the
  caller's own public key), relaying a user's operation, or acting as
  an admin override on the contract.

If a future operation needs the platform to sign, this document and the
`PLATFORM_SIGNER_SECRET` description in `src/config/env.validation.ts`
must be updated together.
