const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const roundRupee = (n) => Math.round(Number(n) / 10) * 10; // estimates rounded to nearest Rs 10
module.exports = { round2, roundRupee };
