export function formatCredits(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 999950) return (n / 1000).toFixed(1).replace('.', ',') + ' k';
  return (n / 1e6).toFixed(2).replace('.', ',') + ' M';
}
