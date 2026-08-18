/**
 * 🛡️ مدير المخاطر وحساب حجم العقود
 */
const CONTRACT_SIZE = 100; // عقد الذهب القياسي (1 لوت = 100 أونصة)

export function calculatePosition(balance, riskPct, entry, sl) {
    if (!entry || !sl || entry === sl) return 0.01;
    
    // حساب المبلغ المخاطر به بالدولار
    const riskAmount = balance * (riskPct / 100);
    
    // حساب مسافة الوقف
    const slDistance = Math.abs(entry - sl);
    
    // حساب حجم اللوت (Lot)
    let lots = riskAmount / (slDistance * CONTRACT_SIZE);
    
    // توحيد اللوت (أقل لوت 0.01، وتدوير لمنزلتين عشريتين)
    lots = Math.max(0.01, Math.round(lots * 100) / 100);
    return lots;
}

export function calculatePnL(entry, exit, side, lots) {
    const diff = side === 'BUY' ? (exit - entry) : (entry - exit);
    return diff * lots * CONTRACT_SIZE;
}
