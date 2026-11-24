# Smart Biz by IMENA Tech Hub

**Manage. Grow. Succeed.**

Smart Biz is a business-management workspace being developed for small and medium-sized businesses, starting in Rwanda. The first prototype includes a dashboard, sales entry, product inventory, customer records, expense tracking, and a basic report view.

## Current prototype

- Responsive browser interface
- Record sales in RWF
- Add products and track stock quantities
- Add customer records
- Record expenses
- View basic totals and export sales/expense records to CSV

## Deploy on Vercel

This repository is a static HTML, CSS, and JavaScript website. To import it into Vercel:

1. Sign in to Vercel with GitHub.
2. Choose **Add New → Project**.
3. Import `imenatechhub/smart-biz-imena`.
4. In Project Settings, select **Other** as the Framework Preset.
5. Leave the Build Command empty.
6. Set the Output Directory to `.` (the repository root).
7. Deploy.

The homepage is `index.html`; its stylesheet and JavaScript are `styles.css` and `app.js`.

## Data and limitations

The prototype currently stores demo records in the browser's local storage. Records are not synchronized between devices or users. Do not use it as the official record system for a real business yet.

## Technology

The current MVP is a static HTML, CSS, and JavaScript prototype. Vercel can host it directly without a build step. GitHub remains the source-code repository.

## Planned next stages

1. Connect a secure Supabase database and user authentication.
2. Separate each business's data and introduce employee roles.
3. Improve receipts, reporting, and inventory workflows.
4. Evaluate compliant electronic invoicing requirements before offering official tax invoices.
5. Add subscription administration and optional integrations.

## Brand

Smart Biz by **IMENA Tech Hub**  
*Manage. Grow. Succeed.*
