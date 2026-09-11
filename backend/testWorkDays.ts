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
    let hasDayInMonth = false;
    for (let i = 0; i < 5; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      if (d.getMonth() === month - 1) hasDayInMonth = true;
      weekDays.push({
        dayNum: d.getDate(),
        weekNum: weekNum,
      });
    }
    if (hasDayInMonth) {
      days.push(...weekDays);
      weekNum++;
    }
    current.setDate(current.getDate() + 7);
  }
  return days;
}

console.log('Ekim:', getWorkDays(2026, 10).map(d => d.dayNum + ' (W' + d.weekNum + ')').join(', '));
console.log('Kasım:', getWorkDays(2026, 11).map(d => d.dayNum + ' (W' + d.weekNum + ')').join(', '));
