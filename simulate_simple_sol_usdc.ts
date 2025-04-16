// simulate_simple_sol_usdc.ts
// Simulates a hypothetical SOL ↔ USDC arbitrage without executing trades

import fetch from 'node-fetch';

const JUP_API = 'https://quote-api.jup.ag/v6/quote';
const ORCA_API = 'https://api.orca.so/allPools';

// Mint addresses
const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Amount in smallest units (e.g. 1 SOL = 1_000_000_000 lamports, 1 USDC = 1_000_000)
const AMOUNT_SOL_LAMPORTS = 1_000_000_000; // 1 SOL

const format = (n?: number | null, decimals = 6) =>
  n ? (n / 10 ** decimals).toFixed(4) : 'N/A';

async function fetchJupiterQuote(inputMint: string, outputMint: string, amount: number): Promise<number | null> {
  try {
    const url = `${JUP_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippage=0.5`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.data?.[0]?.outAmount || null;
  } catch (err) {
    console.error(`❌ Error fetching Jupiter quote:`, err);
    return null;
  }
}

async function fetchOrcaPrice(): Promise<{ solToUsdc?: number; usdcToSol?: number }> {
  try {
    const res = await fetch(ORCA_API);
    const pools = await res.json();

    const pool = pools['SOL/USDC'] || pools['USDC/SOL'];

    if (!pool) {
      console.warn('❌ Could not find SOL/USDC pool in Orca');
      return {};
    }

    const solToUsdc = parseFloat(pool.tokenA?.price || pool.inputTokenPrice || '0');
    const usdcToSol = parseFloat(pool.tokenB?.price || pool.outputTokenPrice || '0');

    return { solToUsdc, usdcToSol };
  } catch (err) {
    console.error(`❌ Error fetching Orca data:`, err);
    return {};
  }
}

(async () => {
  console.log(`🔍 Simulating arbitrage opportunity for SOL ↔ USDC...\n`);

  const [jupBuy, jupSell] = await Promise.all([
    fetchJupiterQuote(SOL, USDC, AMOUNT_SOL_LAMPORTS),  // 1 SOL → USDC
    fetchJupiterQuote(USDC, SOL, 1_000_000),             // 1 USDC → SOL
  ]);

  const { solToUsdc: orcaBuy, usdcToSol: orcaSell } = await fetchOrcaPrice();

  console.log(`💹 Jupiter Prices:`);
  console.log(`  ➤ SOL → USDC: ${format(jupBuy, 6)} USDC`);
  console.log(`  ➤ USDC → SOL: ${format(jupSell, 9)} SOL\n`);

  console.log(`🐙 Orca Prices:`);
  console.log(`  ➤ SOL → USDC: ${orcaBuy?.toFixed(4) || 'N/A'} USDC`);
  console.log(`  ➤ USDC → SOL: ${orcaSell?.toFixed(4) || 'N/A'} SOL\n`);

  if (jupBuy && orcaSell) {
    const buyPrice = jupBuy / 1_000_000; // USDC from Jupiter
    const sellPrice = orcaSell;          // SOL → USDC on Orca
    const inverseBuy = 1 / buyPrice;
    const spread = ((sellPrice - inverseBuy) / inverseBuy) * 100;

    console.log(`🔁 Hypothetical: Buy 1 SOL on Jupiter → Sell on Orca`);
    console.log(`  ➤ Spread: ${spread.toFixed(2)}% ${spread > 0 ? '✅ PROFITABLE' : '❌ Not profitable'}\n`);
  }

  if (orcaBuy && jupSell) {
    const buyPrice = orcaBuy;
    const sellPrice = jupSell / 1_000_000_000; // SOL from Jupiter
    const inverseBuy = 1 / buyPrice;
    const spread = ((sellPrice - inverseBuy) / inverseBuy) * 100;

    console.log(`🔁 Hypothetical: Buy 1 SOL on Orca → Sell on Jupiter`);
    console.log(`  ➤ Spread: ${spread.toFixed(2)}% ${spread > 0 ? '✅ PROFITABLE' : '❌ Not profitable'}\n`);
  }

  console.log('✅ Simulation complete.\n');
})();
