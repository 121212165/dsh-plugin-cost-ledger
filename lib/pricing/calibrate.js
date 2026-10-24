export function calibratePrices(rows) {
    const buckets = new Map();
    for (const row of rows) {
        if (!row.model || !Number.isFinite(row.quota) || row.quota <= 0 || !Number.isFinite(row.tokens) || row.tokens <= 0)
            continue;
        const bucket = buckets.get(row.model) ?? { billed: 0, tokens: 0, calls: 0 };
        bucket.billed += row.quota;
        bucket.tokens += row.tokens;
        bucket.calls += 1;
        buckets.set(row.model, bucket);
    }
    const prices = [];
    for (const [model, bucket] of buckets) {
        if (bucket.tokens < 1000)
            continue; // not enough data to be meaningful
        const usdPerMillion = (bucket.billed / bucket.tokens) * 1e6 / 500_000;
        if (!Number.isFinite(usdPerMillion) || usdPerMillion <= 0)
            continue;
        const rounded = Math.round(usdPerMillion * 100) / 100;
        prices.push({ match: model, currency: 'USD', perMillion: { input: rounded, output: rounded, cacheRead: rounded } });
    }
    return prices.sort((a, b) => a.match.localeCompare(b.match));
}
//# sourceMappingURL=calibrate.js.map