const PRICING_CONFIG = {
  wasteFactor: 1.10,          // +10% safety factor for purge lines and failed starts
  avgPowerKw: 0.14,           // 140W average power draw during printing (Ender 3 Pro heated bed + hotend)
  electricityRatePerKwh: 1.30,// RON (or EUR/USD depending on your currency) per kWh
  depreciationPerHour: 1.50,  // Machine wear, nozzle, PEI sheet depreciation per print hour
  setupFee: 10.00,            // Fixed operator fee for bed prep, removal, and packaging
  marginMultiplier: 1.25,     // 25% commercial markup
};

export function calculateQuotePrice({ filamentGrams, printTimeSeconds, pricePerGram }) {
  const printHours = printTimeSeconds / 3600;

  const materialCost = filamentGrams * pricePerGram * PRICING_CONFIG.wasteFactor;
  const hourlyMachineRate =
    PRICING_CONFIG.avgPowerKw * PRICING_CONFIG.electricityRatePerKwh +
    PRICING_CONFIG.depreciationPerHour;
  const machineTimeCost = printHours * hourlyMachineRate;

  const subtotal = materialCost + machineTimeCost + PRICING_CONFIG.setupFee;
  const totalPrice = subtotal * PRICING_CONFIG.marginMultiplier;

  return {
    totalPrice: Number(totalPrice.toFixed(2)),
    breakdown: {
      materialCost: Number(materialCost.toFixed(2)),
      machineTimeCost: Number(machineTimeCost.toFixed(2)),
      setupFee: PRICING_CONFIG.setupFee,
    },
  };
}
