# Admin Split & Reports Review

## Deployment status (dashboard & admin updates)

The following are **in the codebase**; if you don’t see them in production, deploy the latest code and do a **hard refresh** (Ctrl+Shift+R / Cmd+Shift+R):

- **Dashboard:** “Dashboard month” selector (admin-only), “Activities for [month]”, “Activities last month” card, “This week” only when viewing current month. Backend: `/api/config` returns `dashboardMonth` (default `last`); `GET/PUT /api/admin/config/dashboard-month` for admin.
- **Admin:** Configuration → Reports (simplified copy, no “Open Reports View” button); System Admin → System Users (Status: Active/Inactive/All); System Admin → Sales Users (Status filter); System Admin → POC Sandbox (inline content, no separate “Open POC Sandbox Manager” button).

Ensure production serves the latest `pams-app` and `server` so these routes and UI are live.

**User password reset:** In **System Admin → System Users**, each user row has a **Reset password** button. It sets that user’s password to the default **Welcome@Gupshup1** and clears “require password change,” so they can log in immediately. Use this if a user (e.g. Nikhil Sharma) cannot log in or password reset isn’t working. Backend: `POST /api/admin/users/reset-password` with body `{ "username": "nikhil.sharma" }` (or the exact username shown in the list).

**Industry & Use Cases – Pending (Reject vs Merge):**
- **Reject** only removes the suggestion from the pending list. It does **not** change any existing accounts, projects, or activities. Data that already uses that industry or use case (e.g. from "Other") stays as-is.
- **Merge into** maps a pending value to an existing approved industry or use case and **updates all data**: for industries, all accounts with that industry are updated to the target industry; for use cases, all projects that have that use case are updated to the target use case. The pending item is then removed.

---

## Implementation Plan: Split Admin & Settings

### Structure
- **System Admin** (New sidebar item)
  - Users & Access: System Users, Sales Users
  - Regions
  - Monitoring: Login Activity, Audit Log, Project Health
  - POC Management: POC Sandbox

- **Configuration** (New sidebar item)
  - Industry & Use Cases
  - Interface Settings
  - Analytics: Targets, Reports, Monthly Export
  - Feature Flags

### Technical Approach
1. Create two separate views: `systemAdminView` and `configurationView`
2. Each has its own sidebar navigation (`systemAdminSectionsNav` and `configurationSectionsNav`)
3. Each has its own content container (`systemAdminSectionsContainer` and `configurationSectionsContainer`)
4. Move sections to appropriate containers
5. Update `app.js` to handle both views
6. Update `admin.js` to support both navigation structures

---

## Reports & Functionality Review

### Current Reports (Implemented)
1. **Presales Reports**
   - Total Activities
   - Internal vs External Activity (Pie Chart)
   - Presales Activity Report (Bar Chart)
   - Activity Breakdown (Donut Chart with filter)

2. **Sales View**
   - Sales Rep Most Requests (Top 10)
   - Missing SFDC Links by Region (Bar Chart)
   - Missing SFDC Links by Sales Rep

3. **Regional Data**
   - Sales Rep Missing Opps
   - Industry Regional Traffic
   - Sales Rep Most Requests
   - Missing SFDC by Sales Rep

4. **Product Level Data**
   - Industry Wise - Total Activities
   - Industry Wise - Average Activities

### Suggested Additional Reports

#### 1. **Activity Trends & Forecasting**
   - **Monthly Trend Line Chart**: Show activity count over last 6-12 months
   - **Activity Velocity**: Activities per week/month trend
   - **Forecast**: Projected activities based on historical data
   - **Seasonality Analysis**: Identify peak/off-peak months

#### 2. **Win/Loss Analytics**
   - **Win Rate by Activity Type**: Which activities lead to wins?
   - **Win Rate by Industry**: Industry performance comparison
   - **Win Rate by Presales Rep**: Individual performance
   - **Time to Win**: Average days from first activity to win
   - **Loss Reasons Breakdown**: Most common loss reasons
   - **Competitor Analysis**: Which competitors appear most in losses

#### 3. **Account & Project Health Reports**
   - **Account Engagement Score**: Based on activity frequency and recency
   - **Project Aging Report**: Projects by age buckets (0-30, 31-60, 61-90, 90+ days)
   - **Stale Accounts**: Accounts with no activity in X days
   - **Project Pipeline Health**: Active projects by stage/status
   - **Account Growth Trajectory**: New accounts over time

#### 4. **Presales Performance Reports**
   - **Activity Distribution**: Internal vs External ratio per user
   - **Response Time Metrics**: Time from request to first activity
   - **Activity Quality Score**: Based on completeness (SFDC links, details, etc.)
   - **Top Performers**: By activity count, win rate, response time
   - **Workload Distribution**: Activities per presales rep (balance check)

#### 5. **Sales Collaboration Reports**
   - **Sales Rep Activity Correlation**: Which sales reps generate most presales requests?
   - **Request Fulfillment Rate**: % of requests that get presales activities
   - **Sales-Presales Collaboration Score**: Based on activity frequency
   - **Missing Opportunities by Sales Rep**: Detailed breakdown

#### 6. **Industry & Use Case Analytics**
   - **Use Case Adoption**: Most common use cases by industry
   - **Industry Activity Distribution**: Which industries are most active?
   - **Use Case Success Rate**: Win rate by use case
   - **Emerging Use Cases**: New use cases gaining traction

#### 7. **SFDC Compliance & Data Quality**
   - **SFDC Link Coverage**: % of accounts/projects with SFDC links
   - **Data Completeness Score**: % of activities with all required fields
   - **Compliance Trend**: Improvement over time
   - **Missing Data Alerts**: Accounts/projects needing attention

#### 8. **Regional Performance**
   - **Regional Activity Distribution**: Activities by region
   - **Regional Win Rates**: Performance by region
   - **Regional Resource Utilization**: Presales rep distribution by region
   - **Regional Growth**: New accounts/activities by region over time

#### 9. **POC & Engagement Reports**
   - **POC Success Rate**: POC to win conversion
   - **POC Duration Analysis**: Average POC length
   - **POC by Industry**: Which industries have most POCs?
   - **Sandbox Utilization**: POC sandbox usage patterns

#### 10. **Comparative & Benchmark Reports**
   - **Period-over-Period Comparison**: This month vs last month, this year vs last year
   - **Team Averages**: Individual performance vs team average
   - **Industry Benchmarks**: Compare account performance to industry average
   - **Goal Achievement**: Actual vs target activities

### Suggested Functionality Enhancements

#### 1. **Saved Report Presets**
   - Save custom filter combinations
   - Quick access to frequently used reports
   - Share presets with team

#### 2. **Report Scheduling & Export**
   - Schedule automated report generation
   - Email reports to stakeholders
   - Export to PDF/Excel with custom date ranges
   - Bulk export multiple reports

#### 3. **Drill-Down Capability**
   - Click on chart elements to see underlying data
   - Navigate from summary to detail view
   - Filter activities based on chart selection

#### 4. **Custom Dashboards**
   - Create personalized dashboard views
   - Drag-and-drop report widgets
   - Save multiple dashboard configurations

#### 5. **Alerts & Notifications**
   - Set thresholds for key metrics
   - Get alerts when thresholds are breached
   - Weekly/monthly summary emails

#### 6. **Data Export & Integration**
   - API endpoints for external tools
   - Webhook support for real-time updates
   - Integration with BI tools (Power BI, Tableau)

#### 7. **Advanced Filtering**
   - Multi-select filters
   - Date range presets (Last 7 days, Last 30 days, This Quarter, etc.)
   - Save filter combinations
   - Filter by multiple criteria simultaneously

#### 8. **Activity Templates**
   - Pre-filled activity forms for common scenarios
   - Industry-specific templates
   - Quick log shortcuts

#### 9. **Collaboration Features**
   - @mentions in activity notes
   - Activity assignments
   - Follow-up reminders
   - Activity comments/threads

#### 10. **Mobile Optimization**
   - Responsive design improvements
   - Mobile app or PWA
   - Quick activity logging on mobile

---

## Roadmap Review

### From v1.0-launch-prep.md
**Deferred Features:**
- ✅ Saved filter presets - **Suggested above**
- ✅ Region-aware analytics - **Partially implemented in Reports V2**
- ✅ Native SFDC integration - **Suggested as enhancement**
- ✅ Real external authentication / SSO - **Future enhancement**

**V2 Roadmap Items:**
- ✅ Data & Persistence Hardening - **In progress (Railway deployment)**
- ✅ Workflow Enhancements - **Suggested above (templates, reminders)**
- ✅ Analytics Evolution - **Suggested above (trends, comparisons)**
- ✅ Integrations & Automation - **Suggested above (API, webhooks)**
- ✅ Experience & Accessibility - **Ongoing improvements**

### From REPORTS_V2_PLAN.md
**Already Implemented:**
- ✅ Presales Reports section
- ✅ Sales View section
- ✅ Product Level Data section
- ✅ Monthly/Annual toggle
- ✅ Month navigation

**Suggested Enhancements (from plan):**
- ✅ Export functionality - **Suggested above**
- ✅ Drill-down - **Suggested above**
- ✅ Comparison - **Suggested above**
- ✅ Filters - **Partially implemented, can enhance**

---

## Priority Recommendations

### High Priority (Quick Wins)
1. **Period-over-Period Comparison** - Easy to add, high value
2. **Activity Trends Line Chart** - Visual trend analysis
3. **Win/Loss Analytics** - Leverage existing win/loss data
4. **Saved Report Presets** - Improve user experience
5. **Drill-Down from Charts** - Enhance interactivity

### Medium Priority (Moderate Effort)
1. **Account Engagement Score** - Useful metric
2. **Presales Performance Reports** - Team insights
3. **SFDC Compliance Trends** - Track improvement
4. **Report Scheduling** - Automation value
5. **Advanced Filtering** - Better data exploration

### Low Priority (Future Enhancements)
1. **Custom Dashboards** - Complex but powerful
2. **API/Webhooks** - Integration capabilities
3. **Mobile App** - Broader accessibility
4. **Collaboration Features** - Team workflow
5. **Activity Templates** - Efficiency improvement

---

## Implementation Notes

### Technical Considerations
- All reports should use the existing `DataManager` and `ReportsV2` structure
- Charts should use Chart.js (already integrated)
- Maintain consistency with existing report design patterns
- Ensure reports work with both monthly and annual views
- Consider performance for large datasets

### Data Requirements
- Most reports can use existing data structures
- May need to add computed fields for scores/ratings
- Consider caching for expensive calculations
- Ensure data freshness indicators

### User Experience
- Maintain consistent UI/UX with existing reports
- Add loading states for heavy calculations
- Provide empty states with helpful messages
- Include export options on all reports
- Add tooltips/help text for complex metrics

---

## Admin & Configuration Pages – Changes & Suggestions

### Implemented (this pass)

1. **Configuration → Reports**
   - Removed the “Open Reports View” button; section now only explains that Reports are in the main sidebar.

2. **System Admin → System Users**
   - Added **Status** filter: **Active only** (default), **Inactive only**, **All**. List is filtered by `user.isActive`.

3. **System Admin → Sales Users**
   - Added **Status** filter: **Active only** (default), **Inactive only**, **All**. Works with existing Region and Search filters.

4. **System Admin → POC Sandbox**
   - POC Sandbox content (filters + table) is now rendered **inline** in the System Admin panel. Removed the “Open POC Sandbox Manager” button. Opening “POC Sandbox” loads the section and calls `loadPOCSandbox()`. The standalone `adminPocView` redirects to System Admin → POC Sandbox.

### Further suggestions for Admin & Configuration

1. **System Admin**
   - **Regions**: Add “Active only” count in summary (regions in use vs unused). “Remove Unused” already exists; consider a short explanation/tooltip.
   - **Login Activity**: Consider a date-range quick filter (e.g. Last 7 / 14 / 30 days) in addition to paging.
   - **Audit Log**: Same as Login Activity: optional date filter and/or “Refresh” label to match other sections.
   - **Project Health**: Section is settings-only; consider a one-line note that the actual Project Health view is in the main sidebar.

2. **Configuration**
   - **Interface**: Section is empty (`interface: () => {}`). Either add a short “Interface settings are applied from the main Interface selector” message or wire real options (e.g. theme, default view) here.
   - **Reports**: Already simplified; no further change unless you want a direct “Open Reports” link that switches view.
   - **Monthly Export**: Consider presetting the month input to the current month on open.
   - **Feature Flags**: Consider grouping by category (e.g. “Access”, “Import”, “Analytics”) and adding short help text per flag.

3. **General**
   - **Consistency**: Ensure every section that loads data has a visible “Refresh” or “Reload” where it makes sense (e.g. Audit Log, Login Activity already do).
   - **Empty states**: Standardise “No X match the current filter” / “No X yet” messages and optional primary action (e.g. “Add first user”).
   - **Breadcrumb / context**: In card interface, when deep in System Admin or Configuration, a “Back to Dashboard” or “Back to [System Admin / Configuration]” can reduce disorientation.
