function getWorkDays(year: number, month: number) {
  const days = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOfWeek = new Date(firstDay);
  const dow = startOfWeek.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
  let current = new Date(startOfWeek);
  let weekNum = 0;
  while (current.getTime() <= lastDay.getTime()) {
    const weekDays = [];
    
    // Determine the Thursday of this week
    const thursday = new Date(current);
    thursday.setDate(current.getDate() + 3); // 0=Mon, 1=Tue, 2=Wed, 3=Thu
    
    // If Thursday is in the target month, this week belongs to this month
    if (thursday.getMonth() === month - 1) {
      for (let i = 0; i < 5; i++) {
        const d = new Date(current);
        d.setDate(current.getDate() + i);
        weekDays.push({
          dayNum: d.getDate(),
          weekNum: weekNum,
        });
      }
      days.push(...weekDays);
      weekNum++;
    }
    
    current.setDate(current.getDate() + 7);
  }
  return days;
}

console.log('Eylül:', getWorkDays(2026, 9).map(d => d.dayNum + ' (W' + d.weekNum + ')').join(', '));
console.log('Ekim:', getWorkDays(2026, 10).map(d => d.dayNum + ' (W' + d.weekNum + ')').join(', '));
console.log('Kasım:', getWorkDays(2026, 11).map(d => d.dayNum + ' (W' + d.weekNum + ')').join(', '));
