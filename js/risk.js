/**
 * 🛡️ مدير المخاطر الاحترافي (Advanced Risk Manager)
 * يدعم قيود اللوت، السبريد، والعمولات
 */
const DEFAULT_SETTINGS = {
    contractSize: 100, // 1 لوت = 100 أونصة
    minLot: 0.01,
    maxLot: 100.0,
    lotStep: 0.01,
    commissionPerLot: 7.00 // 7 دولار عمولة لكل لوت ستاندرد
};

export function calculatePosition(balance, riskPct, entry, sl, settings = DEFAULT_SETTINGS) {
    if (!entry || !sl || entry === sl) return settings.minLot;
    
    const riskAmount = balance * (riskPct / 100);
    const slDistance = Math.abs(entry - sl);
    
    // الحساب الأولي للوت
    let lots = riskAmount / (slDistance * settings.contractSize);
    
    // تقريب اللوت حسب الخطوة المسموحة (Lot Step)
    const invStep = 1 / settings.lotStep;
    lots = Math.round(lots * invStep) / invStep;
    
    // الالتزام بالحد الأدنى والأقصى للوت
    return Math.max(settings.minLot, Math.min(settings.maxLot, lots));
}

export function calculatePnL(entry, exit, side, lots, settings = DEFAULT_SETTINGS) {
    const diff = side === 'BUY' ? (exit - entry) : (entry - exit);
    const grossPnL = diff * lots * settings.contractSize;
    const totalCommission = lots * settings.commissionPerLot;
    
    return grossPnL - totalCommission;
}
