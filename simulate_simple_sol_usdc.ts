// simulate_simple_sol_usdc.ts
// Simulates a hypothetical SOL ↔ USDC arbitrage without executing trades

import fetch from 'node-fetch';

const JUP_API = 'https://quote-api.jup.ag/v6/quote';
const ORCA_API = 'https://api.orca.so/allPools';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const AMOUNT = 1_000_000; // in lamports (1 SOL = 1e9; 1 USDC = 1e6)

async function fetchJupiterQuote(inputMint: string, outputMint: string): Promise<number | null> {
  const url = `${JUP_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${AMOUNT}&slippage=0.5`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.data?.[0]?.outAmount || null;
}

async function fetchOrcaPrice(): Promise<{ solToUsdc?: number; usdcToSol?: number }> {
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
}

(async () => {
  console.log(`🔍 Simulating arbitrage opportunity for SOL/USDC...\n`);

  const [jupBuy, jupSell] = await Promise.all([
    fetchJupiterQuote(SOL, USDC),
    fetchJupiterQuote(USDC, SOL),
  ]);

  const { solToUsdc: orcaBuy, usdcToSol: orcaSell } = await fetchOrcaPrice();

  const format = (n?: number | null) => n ? (n / 1e6).toFixed(4) : 'N/A';

  console.log(`💹 Jupiter Prices (simulated 1 SOL):`);
  console.log(`  ➤ SOL → USDC: ${format(jupBuy)} USDC`);
  console.log(`  ➤ USDC → SOL: ${format(jupSell)} SOL\n`);

  console.log(`🐙 Orca Prices (reported):`);
  console.log(`  ➤ SOL → USDC: ${orcaBuy?.toFixed(4) || 'N/A'} USDC`);
  console.log(`  ➤ USDC → SOL: ${orcaSell?.toFixed(4) || 'N/A'} SOL\n`);

  if (jupBuy && orcaSell) {
    const buyPrice = jupBuy / 1e6;
    const sellPrice = orcaSell;
    const spread = ((sellPrice - 1 / buyPrice) / (1 / buyPrice)) * 100;
    console.log(`🔁 Hypothetical: Buy 1 SOL on Jupiter → Sell on Orca`);
    console.log(`  ➤ Spread: ${spread.toFixed(2)}% ${spread > 0 ? '✅ PROFITABLE' : '❌ Not profitable'}\n`);
  }

  if (orcaBuy && jupSell) {
    const buyPrice = orcaBuy;
    const sellPrice = jupSell / 1e6;
    const spread = ((sellPrice - 1 / buyPrice) / (1 / buyPrice)) * 100;
    console.log(`🔁 Hypothetical: Buy 1 SOL on Orca → Sell on Jupiter`);
    console.log(`  ➤ Spread: ${spread.toFixed(2)}% ${spread > 0 ? '✅ PROFITABLE' : '❌ Not profitable'}\n`);
  }

  console.log('✅ Simulation complete.\n');
})();
