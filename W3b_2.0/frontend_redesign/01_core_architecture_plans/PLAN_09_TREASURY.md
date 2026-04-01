# Frontend Redesign Phase 9: The Target Treasury & Capital Routing

**Status:** APPROVED
**Topic:** Managing Fiat/Crypto Inflows and Capital Settlement (`/treasury`)

## 1. The Strategy: The Prime Brokerage Vault
A serious fund needs a dedicated view designed explicitly for capital allocation. Rather than "depositing money to bet," LPs "allocate capital to the Treasury" and then "assign it to Execution Vaults." The UI must be unassailable, with deep integration into whatever ramps (Circle, Plaid, Bank Wires, or Base Network USDC) we choose.

## 2. Intricacies & Components

**1. `<TreasuryLedger>`**
- A brutally simple, two-column grid. Date, Type (Deposit/Withdrawal/Fee/Settlement), Amount, Hash/TxID.
- Emphasize the T+1 or T+2 settlement cycles to reinforce the realism of a functioning fund.

**2. `<AllocationDial>`**
- Once funds are in the Treasury, the LP sets their `<Auto_Hedge_Limit>`. If they deposit 10,000 USDC, they can set the algorithm to only ever deploy a mathematical strict maximum of 5,000 USDC at any given time (Kelly constraint overriding).

**3. `<PerformanceFeeClawback>` Visualizer**
- An ultra-transparent view: "You made $1,000. W3B automatically subtracts 20% ($200) performance fee at settlement." No hidden fees, mathematically exact accounting rendered in Platinum and Gold.
