function testDateLogic(mockDateString) {
    console.log('--- Testing with mock date:', mockDateString, '---');
    const mockDate = new Date(mockDateString);
    
    // Test logic for refreshGlobalCoinPool
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'numeric'
    });
    const parts = formatter.formatToParts(mockDate);
    const currentYear = parseInt(parts.find(p => p.type === 'year').value, 10);
    const currentMonth = parseInt(parts.find(p => p.type === 'month').value, 10);
    
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }
    
    const prevMonthStr = String(prevMonth).padStart(2, '0');
    const firstDayLastMonth = new Date(`${prevYear}-${prevMonthStr}-01T00:00:00+08:00`);
    
    const currentMonthStr = String(currentMonth).padStart(2, '0');
    const firstDayCurrentMonth = new Date(`${currentYear}-${currentMonthStr}-01T00:00:00+08:00`);
    const lastDayLastMonth = new Date(firstDayCurrentMonth.getTime() - 1000);
    
    console.log('Previous Month Bounds (UTC):');
    console.log('firstDayLastMonth: ', firstDayLastMonth.toISOString());
    console.log('lastDayLastMonth:  ', lastDayLastMonth.toISOString());
    
    // Test logic for auditGamificationEconomy
    const auditFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit'
    });
    const auditParts = auditFormatter.formatToParts(mockDate);
    const aYear = auditParts.find(p => p.type === 'year').value;
    const aMonth = auditParts.find(p => p.type === 'month').value;
    const auditFirstDayOfMonth = new Date(`${aYear}-${aMonth}-01T00:00:00+08:00`);
    
    console.log('Audit Query Lower Bound (UTC):');
    console.log('auditFirstDayOfMonth:', auditFirstDayOfMonth.toISOString());
    console.log('');
}

testDateLogic('2026-07-01T00:00:00+08:00'); // July
testDateLogic('2027-01-01T00:00:00+08:00'); // January (Year boundary)
testDateLogic('2024-03-01T00:00:00+08:00'); // March leap year
