function calculateSalaryBreakdown({
  grossSalary = 0,
  leaveDays = 0,
  workingDays = 26,
  basicPercentage = 50,
  pfPercentage = 12,
  ptAmount = 200,
  tds = 0,
  otherDeductions = 0
}) {
  const gross = Math.max(0, Number(grossSalary) || 0);
  const leaves = Math.max(0, Number(leaveDays) || 0);
  const wDays = Math.max(1, Number(workingDays) || 26);
  const basicPct = Number(basicPercentage) || 50;
  const pfPct = Number(pfPercentage) || 12;
  const pt = Number(ptAmount) >= 0 ? Number(ptAmount) : 200;
  const tax = Math.max(0, Number(tds) || 0);
  const other = Math.max(0, Number(otherDeductions) || 0);

  // 1. Basic Pay = basicPercentage% of Gross Salary
  const basicSalary = Number(((gross * basicPct) / 100).toFixed(2));

  // 2. PF = pfPercentage% of Basic Pay
  const pf = Number(((basicSalary * pfPct) / 100).toFixed(2));

  // 3. Daily Salary & Leave Deduction
  const dailySalary = gross / wDays;
  const leaveDeduction = Number((dailySalary * leaves).toFixed(2));

  // 4. Total Deductions = PF + PT + Leave Deduction + TDS + Other Deductions
  const totalDeductions = Number((pf + pt + leaveDeduction + tax + other).toFixed(2));

  // 5. Net Salary = Gross Salary - Total Deductions
  const netSalary = Number(Math.max(0, (gross - totalDeductions)).toFixed(2));

  return {
    grossSalary: gross,
    basicSalary,
    pf,
    pt,
    leaveDays: leaves,
    leaveDeduction,
    tds: tax,
    otherDeductions: other,
    totalDeductions,
    netSalary,
    workingDays: wDays
  };
}

module.exports = { calculateSalaryBreakdown };
