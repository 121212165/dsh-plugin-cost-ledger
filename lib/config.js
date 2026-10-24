export const DEFAULT_CONFIG = {
    enabled: true,
    accounting: 'own',
    prices: [],
    holidays: [],
};
export function validateConfig(config) {
    const problems = [];
    if (config.accounting && !['own', 'assume-price-aware'].includes(config.accounting)) {
        problems.push({ field: 'accounting', message: `accounting 需为 own|assume-price-aware，收到 ${config.accounting}` });
    }
    for (const [index, entry] of (config.prices ?? []).entries()) {
        if (!entry?.id) {
            problems.push({ field: 'prices', message: `prices[${index}] 缺少 id` });
            continue;
        }
        const perMillion = entry.perMillion ?? {};
        for (const key of ['uncachedInput', 'output', 'cacheRead']) {
            const value = perMillion[key];
            if (value === undefined || !Number.isFinite(value) || value < 0) {
                problems.push({ field: 'prices', message: `prices[${index}] (${entry.id}) 的 ${key} 需是 ≥0 的有限数` });
            }
        }
    }
    for (const day of config.holidays ?? []) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            problems.push({ field: 'holidays', message: `holidays 里的 ${day} 不是 YYYY-MM-DD` });
        }
    }
    return problems;
}
//# sourceMappingURL=config.js.map