export function progressLabel(completedBattles: number): string {
  if (completedBattles === 12) return "원정 완주";
  if (completedBattles % 4 === 0) return `페이즈 ${completedBattles / 4} 보스 처치`;
  const phase = Math.floor(completedBattles / 4) + 1;
  const encounter = ((completedBattles - 1) % 4) + 1;
  return `페이즈 ${phase} 일반전투 ${encounter}회 승리`;
}
