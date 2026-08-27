# Financial Health & Intelligent Recommendations Engine Specification

## 1. Executive Overview
The **Financial Health & Intelligent Recommendations Dashboard** serves as the executive cockpit for Epicenter Gym. It correlates all **Ingoing Revenue Streams** (Memberships, Day Passes, Store Sales, Personal Training) with all **Outgoing Flows & Liabilities** (Utilities, Payroll, COGS, OPEX, Supplier Credits) to calculate real-time profitability, compute industry-standard financial health ratios, and generate actionable strategic recommendations.

---

## 2. Mathematical Formulations & Threshold Benchmarks

### 2.1. Net Operating Profit & Profit Margin
$$\text{Net Operating Profit} = \text{Total Inflows} - (\text{Utilities} + \text{Payroll} + \text{COGS} + \text{OPEX} + \text{Interest/Liabilities})$$
$$\text{Net Profit Margin (\%)} = \left( \frac{\text{Net Operating Profit}}{\text{Total Inflows}} \right) \times 100$$
* **Healthy Gym Benchmark**: $20\% - 35\%$
* **Warning Threshold**: $< 10\%$
* **Critical Deficit**: $< 0\%$

### 2.2. Payroll-to-Revenue Ratio (Labor Efficiency)
$$\text{Payroll Ratio (\%)} = \left( \frac{\text{Staff Wages} + \text{Trainer Commissions}}{\text{Total Inflows}} \right) \times 100$$
* **Healthy Benchmark**: $30\% - 35\%$
* **Alert Trigger**: $> 40\%$ (Flags shift schedule optimization during low-traffic hours).

### 2.3. Utilities-to-Revenue Ratio (Operational Overhead)
$$\text{Utilities Ratio (\%)} = \left( \frac{\text{Electricity} + \text{Water} + \text{Internet}}{\text{Total Inflows}} \right) \times 100$$
* **Healthy Benchmark**: $8\% - 12\%$
* **Alert Trigger**: $> 15\%$ (Flags air-conditioning schedule and heavy lighting review).

### 2.4. Operating Cash Runway (Days of Buffer)
$$\text{Average Daily OPEX} = \frac{\text{Total Monthly Outflows}}{\text{Days in Month}}$$
$$\text{Cash Runway (Days)} = \frac{\text{Front Desk Cash} + \text{Bank / GCash Reserves}}{\text{Average Daily OPEX}}$$
* **Healthy Benchmark**: $\ge 30\text{ Days}$
* **Warning**: $15 - 29\text{ Days}$
* **Critical Runway Alert**: $< 15\text{ Days}$ (Freeze non-essential purchases & accelerate renewal collections).

---

## 3. Intelligent Recommendation Engine Rules

| Condition | Severity | System Recommendation Generated |
| :--- | :---: | :--- |
| **Projected Deficit** (Next 15-day outflows > projected cash pace) | 🚨 High | *"Projected ₱X shortfall by month-end. Action: Launch a 3-day flash discount for 6-month membership renewals to generate upfront cash."* |
| **Electricity Ratio > 15%** | ⚠️ Medium | *"Electricity is taking X% of revenue (spiked by ₱Y). Action: Verify thermostat limits (keep at 23°C-24°C) and AC timer shutdown during off-peak hours (1 PM - 4 PM)."* |
| **Payroll Ratio > 40%** | ⚠️ Medium | *"Payroll is consuming X% of revenue. Action: Audit staff attendance vs. foot traffic peaks. Align trainer compensation with PT package sales."* |
| **Overdue Bills / Supplier Terms** | 🚨 High | *"X bills totaling ₱Y are past due. Action: Prioritize strict supplier terms first to avoid inventory supply disruptions."* |
| **High Net Margin (> 30%)** | 💡 Positive | *"Healthy cash surplus of ₱X this period. Action: Allocate 30% to emergency reserve buffer and pay down supplier liabilities early."* |

---

## 4. UI Architecture & Components

1. **Dashboard Route**: `/store/financial-health` (Admin & Manager access).
2. **Key Metric Cards**: Net Profit, Total Revenue, Total Outflows, Cash Runway Days, and Health Score (A / B / C / D).
3. **Charts**:
   - Outflow Breakdown (ApexCharts Donut).
   - Ingoing vs. Outgoing Trend (ApexCharts Stacked Bar & Line).
4. **Actionable Recommendations List**: Cards with color-coded severity tags (Urgent, Warning, Opportunity).
