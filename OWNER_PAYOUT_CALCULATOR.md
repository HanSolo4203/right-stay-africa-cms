# Owner Payout Calculator - Live Expense & Commission Tracking

## Overview
The Owner Statements page now includes a live calculator for each property that allows you to:
- Add additional expenses (cleaning, welcome packs, etc.)
- Set RightStay Africa commission percentage
- See final owner payout calculated in real-time

## Features

### 1. RightStay Africa Commission
- **Input**: Percentage rate (e.g., 17.5%)
- **Calculation**: Percentage of Net Revenue
- **Live Update**: Updates as you type
- **Per Property**: Each property can have different commission rates

### 2. Additional Expenses
- **Add Multiple**: Unlimited expense line items
- **Fields**:
  - Expense Name (e.g., "Cleaning Fee", "Welcome Pack")
  - Quantity (e.g., 2 cleanings)
  - Unit Price (e.g., R 250.00)
- **Auto-Calculate**: Total = Quantity × Price
- **Remove**: Delete any expense line
- **Subtotal**: Automatic total of all expenses

### 3. Final Owner Payout
- **Live Calculation**: Updates as you add expenses or change commission
- **Formula**: Net Revenue - Expenses - RightStay Commission
- **Clear Breakdown**: Shows each deduction

## How It Works

### Calculation Flow

```
Step 1: Net Revenue (from CSV import)
  ↓
Step 2: Subtract Additional Expenses
  - Cleaning Fees
  - Welcome Packs
  - Other expenses you track
  ↓
Step 3: Subtract RightStay Commission
  - Calculated as % of Net Revenue
  ↓
Step 4: Final Owner Payout
  - This is what the owner receives
```

### Example Calculation

**Property: 126709 (Dylan Hayward)**

```
Net Revenue: R 7,889.11

Additional Expenses:
  - Cleaning Fee: 3 × R 250.00 = R 750.00
  - Welcome Pack: 1 × R 80.00  = R 80.00
  Total Expenses: R 830.00

RightStay Commission:
  - Rate: 17.5% of Net Revenue
  - Amount: R 7,889.11 × 17.5% = R 1,380.59

Final Owner Payout:
  R 7,889.11 - R 830.00 - R 1,380.59 = R 5,678.52
```

## User Interface

### Commission Section (Blue)
- Input field for percentage rate
- Shows calculated commission amount
- Updates live as you type

### Expenses Section (Gray)
- "Add Expense" button to add new line items
- Each line shows:
  - Text input for expense name
  - Number input for quantity
  - Number input for unit price
  - Calculated total (quantity × price)
  - Delete button
- Shows total expenses at bottom

### Owner Payout Section (Green)
- Net Revenue (from bookings)
- Less: Additional Expenses (red, negative)
- Less: RightStay Commission (red, negative)
- **Final Owner Payout** (bold, large, green)

## Usage Instructions

### Step 1: Expand a Property
Click on a property in the owner statements to expand its details.

### Step 2: Set Commission Rate
1. Find the "RightStay Africa Commission" section (blue)
2. Enter your commission percentage (e.g., 17.5)
3. Commission amount calculates automatically

### Step 3: Add Expenses
1. Click "Add Expense" button
2. Fill in:
   - Expense name (e.g., "Cleaning Fee")
   - Quantity (e.g., 3)
   - Unit Price (e.g., 250)
3. Total calculates automatically (3 × 250 = R 750)
4. Add more expenses as needed
5. See total expenses update automatically

### Step 4: Review Final Payout
The "Final Owner Payout" section shows:
- What the owner will receive
- Clear breakdown of all deductions
- Updates live as you change values

### Step 5: Generate Statement
Use the PDF or Email buttons to send the statement to the owner with the calculated payout.

## Common Expenses to Add

### For Each Property/Month
- **Cleaning Fees**: Number of cleanings × rate
- **Welcome Packs**: Number of arrivals × pack cost
- **Maintenance**: Any repairs or maintenance
- **Utilities**: Water, electricity (if you cover)
- **Insurance**: Property insurance portion
- **Keys/Access**: Locksmith, key cutting
- **Supplies**: Toiletries, coffee, etc.

### Example Expense Entries

```
Expense Name        Qty    Price      Total
------------------------------------------------
Cleaning Fee         3    × R 250  = R 750.00
Welcome Pack         2    × R 80   = R 160.00
Key Replacement      1    × R 350  = R 350.00
WiFi Router          1    × R 899  = R 899.00
------------------------------------------------
Total Expenses                      R 2,159.00
```

## Data Persistence

### Current Session Only
- Expenses and commission rates are stored in **browser state**
- They persist as long as the page is open
- Refreshing the page will reset them

### Future Enhancement
In the future, this could be saved to the database to:
- Track historical expenses
- Pre-populate common expenses
- Generate expense reports
- Compare month-to-month

## Calculation Formulas

### Net Revenue (from bookings)
Already calculated based on channel:
- **Airbnb**: Gross Revenue - Booking Taxes - Fees - Commission
- **Booking.com/Uplisting**: Gross Revenue - Fees - Commission (taxes kept)

### RightStay Commission
```typescript
commission = netRevenue × (commissionRate / 100)

Example:
netRevenue = R 7,889.11
commissionRate = 17.5%
commission = 7,889.11 × 0.175 = R 1,380.59
```

### Total Expenses
```typescript
totalExpenses = Σ(expense.quantity × expense.price)

Example:
Cleaning: 3 × 250 = R 750.00
Welcome: 1 × 80 = R 80.00
Total = R 830.00
```

### Final Owner Payout
```typescript
ownerPayout = netRevenue - totalExpenses - rightStayCommission

Example:
R 7,889.11 - R 830.00 - R 1,380.59 = R 5,678.52
```

## Visual Design

### Color Coding
- 🔵 **Blue**: RightStay commission (your fee)
- ⚪ **Gray**: Additional expenses (your costs)
- 🟢 **Green**: Final owner payout (what they get)
- 🔴 **Red**: Deductions (negative values)

### Layout
```
┌─────────────────────────────────────────────┐
│ Property: 126709 - Dylan Hayward            │
│ Net Revenue: R 7,889.11    Bookings: 3      │
├─────────────────────────────────────────────┤
│                                             │
│ [Booking details table]                     │
│                                             │
├─────────────────────────────────────────────┤
│ 🔵 RightStay Africa Commission              │
│    [17.5] % of Net Revenue                  │
│    Commission: R 1,380.59                   │
├─────────────────────────────────────────────┤
│ ⚪ Additional Expenses        [Add Expense] │
│                                             │
│    [Cleaning Fee] [3] × [250] = R 750.00 🗑 │
│    [Welcome Pack] [1] × [80]  = R 80.00  🗑 │
│                                             │
│    Total Expenses: R 830.00                 │
├─────────────────────────────────────────────┤
│ 🟢 Final Owner Payout                       │
│                                             │
│    Net Revenue:          R 7,889.11         │
│    - Expenses:          -R   830.00         │
│    - Commission (17.5%):-R 1,380.59         │
│    ─────────────────────────────────        │
│    OWNER PAYOUT:         R 5,678.52         │
└─────────────────────────────────────────────┘
```

## Benefits

✅ **Live Calculations**: Updates as you type
✅ **Clear Breakdown**: See exactly where money goes
✅ **Flexible Expenses**: Add as many as needed
✅ **Per-Property Rates**: Different commission for different owners
✅ **Professional**: Ready for owner review
✅ **Easy Input**: Simple quantity × price format

## Tips for Use

### 1. Set Default Commission
Start by setting your standard commission rate (e.g., 17.5%) for each property.

### 2. Add Common Expenses
Create standard expense entries:
- Cleaning fees (# of bookings × cleaning rate)
- Welcome packs (# of arrivals × pack cost)

### 3. Verify Calculations
Cross-check the final payout with your manual calculations to ensure accuracy.

### 4. Screenshot for Records
Take screenshots of the calculated payouts for your records before generating PDFs.

### 5. Consistent Naming
Use consistent expense names for easier tracking:
- "Cleaning Fee" (not "Cleaning" or "Clean")
- "Welcome Pack" (not "Welcome" or "Pack")

## Future Enhancements

Potential features to add:
- Save expenses to database
- Template expense sets (e.g., "Standard Month")
- Expense history per property
- Comparison with previous months
- Bulk apply expenses to all properties
- Export expense breakdown to PDF
- Track expense trends over time

## Summary

✅ **Live expense tracking** per property
✅ **RightStay commission calculator** with custom rates
✅ **Final owner payout** calculated automatically
✅ **Clean, professional interface**
✅ **Real-time updates** as you input data

The owner statements page is now a complete financial calculator for each property! 🎉

