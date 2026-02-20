# Migration mapping (for validation)

Generated from `pams_migration_ready_v3.csv`. Use this to validate best-fit industry and duplicate groups before implementation.

## 1. Canonical PAMS industries

1. Banking
2. Fintech
3. Insurance
4. Retail / eCommerce
5. Healthcare
6. B2B / Manufacturing
7. Automotive
8. Real Estate
9. Hospitality
10. Transportation
11. Sports
12. Gov / Citizen Services
13. Education
14. Media & Entertainment
15. IT & Software
16. CPG & FMCG
17. Pharma & Life Sciences
18. Logistics & Supply Chain
19. Industrial
20. Agritech
21. Professional Services

## 2. Source → PAMS industry mapping (used for best-fit)

| Source (from CSV) | PAMS canonical |
|-------------------|----------------|
| BFSI, Banking | Banking |
| Financial Services, Fintech | Fintech |
| Insurance | Insurance |
| Retail & eCommerce, Retail / eCommerce | Retail / eCommerce |
| Education, Healthcare, Automotive, etc. | (see script map) |
| Goverment (typo) | Gov / Citizen Services |
| utility : energy, gas | Industrial |
| F&B | CPG & FMCG |

## 3. Duplicate candidates (normalized name)

Accounts that share the same normalized name (lowercase, trim, collapse spaces) – review for merge in Migration mode.

- **6th street**: 6th Street, 6th street
- **abfrl**: ABFRL, abfrl
- **acko**: Acko, acko
- **aditya birla**: Aditya Birla, aditya birla
- **agiletelecom**: Agiletelecom, agiletelecom
- **airasia**: AirAsia, airasia
- **al essa**: AL Essa, Al Essa
- **al ghurair**: Al Ghurair, Al ghurair
- **amazon**: Amazon, amazon
- **andwhyte**: AndWhyte, Andwhyte
- **antara senior care**: Antara Senior Care, Antara Senior care
- **appsforbharat**: AppsForBharat, Appsforbharat
- **arabia insurance**: Arabia Insurance, Arabia insurance
- **axis bank**: Axis Bank, Axis bank, axis bank, Axis Bank MK, Axis Bank mk — *treat as same account (merge all into "Axis Bank").*
- **azadea group**: Azadea Group, Azadea group
- **babyplanetonline**: Babyplanetonline, babyplanetonline
- **bank of baroda**: Bank of Baroda, Bank of baroda
- **beenow**: Beenow, beenow
- **belagavi police department**: Belagavi Police Department, Belagavi Police department, Belagavi police department
- **big basket**: Big Basket, Big basket
- **bob card**: BOB Card, bob card
- **carl zeiss**: Carl Zeiss, Carl zeiss
- **carmen**: Carmen, carmen
- **ceew**: CEEW, CeeW
- **cipla**: Cipla, cipla
- **colmexpro**: Colmexpro, colmexpro
- **coto community**: COTO Community, Coto Community
- **cp plus**: CP Plus, Cp Plus
- **cred**: CRED, Cred
- **cris**: CRIS, Cris
- **critical path technologies pvt ltd**: Critical Path Technologies Pvt Ltd, Critical Path Technologies pvt ltd
- **curefit**: Curefit, curefit
- **dhan**: Dhan, dhan
- **dhl**: DHL, dhl
- **diageo cocktail festival 2025**: Diageo Cocktail Festival 2025, Diageo Cocktail festival 2025
- **dipr punjab**: DIPR Punjab, Dipr Punjab
- **dp world**: DP World, DP world
- **equentis**: Equentis, equentis
- **everyworks**: Everyworks, everyworks
- **eyewa**: Eyewa, eyewa
- **fcbsix**: FCBSix, fcbsix
- **federal bank**: Federal Bank, federal bank
- **fedex** (combine into one account): FedEx, Fedex, FedEx APAC, Fedex Apac, FedEx LAC, FedEx Lac, Fedex LAC, FedEx LATAM, Fedex Latam — *one "FedEx" account with projects **APAC**, **LATAM** (and LAC if needed). Mark as **International account** (sales rep at project level).*
- **fibe**: Fibe, fibe
- **finnable**: Finnable, finnable
- **flipkart**: FlipKart, Flipkart, flipkart
- … and 111 more groups.

## 4. Sample: Account → best-fit Industry (first 80)

| Account Name | Row count | Top source industry | Suggested PAMS industry | Duplicate? |
|--------------|-----------|----------------------|------------------------|------------|
| [Webinar] The WhatsApp Voice Advantage | 1 | (webinar) | *Treat as internal activity; not an account.* |  |
| &Whyte | 1 | Software Provider | Software Provider (add to canonical?) |  |
| 000 inbound messages per month. | 1 |  |  |  |
| 11X | 1 | Software Provider | Software Provider (add to canonical?) |  |
| 12Bet | 1 | Gaming | Gaming (add to canonical?) |  |
| 2Safe/Acordo Fácil | 1 | BFSI | Banking |  |
| 3 complementary | 1 |  |  |  |
| 360INC | 1 | Software Provider | Software Provider (add to canonical?) |  |
| 36nine | 2 | Software Provider | Software Provider (add to canonical?) |  |
| 3A Capita | 1 | BFSI | Banking |  |
| 3A Financial Services | 1 | BFSI | Banking |  |
| 3sbrokers.com | 1 | Real Estate | Real Estate |  |
| 6th Steet | 1 | Retail & eCommerce | Retail / eCommerce |  |
| 6th Street | 3 | Retail & eCommerce | Retail / eCommerce | Yes |
| 6th street | 1 | Retail & eCommerce | Retail / eCommerce | Yes |
| 6th Streeyt | 1 | Retail & eCommerce | Retail / eCommerce |  |
| 9 star | 1 | BFSI | Banking |  |
| 91Trucks | 1 | Automotive | Automotive |  |
| A-One Steels India Ltd | 1 | Manufacturing | Manufacturing (add to canonical?) |  |
| a1 Steels | 1 | Steel | Steel (add to canonical?) |  |
| AAA Group | 1 | Automotive | Automotive |  |
| Abbas M | 1 | Real Estate | Real Estate |  |
| Abbot | 1 | Healthcare | Healthcare |  |
| ABC | 1 | Education | Education |  |
| ABFRL | 3 | Retail & eCommerce | Retail / eCommerce | Yes |
| abfrl | 1 | Retail & eCommerce | Retail / eCommerce | Yes |
| Abhishek Phillips | 1 | BFSI | Banking |  |
| Abode Poperty | 1 | Real Estate | Real Estate |  |
| Abode Property | 1 | Real Estate | Real Estate |  |
| Abode Property - buyer | 1 | Real Estate | Real Estate |  |
| Abode Property - Seller Bot | 1 | Real Estate | Real Estate |  |
| Abott - Capillary | 1 | Healthcare | Healthcare |  |
| ABSL | 1 | Retail & eCommerce | Retail / eCommerce |  |
| ABSLI | 1 | BFSI | Banking |  |
| Absolute Barbeque | 1 | Retail & eCommerce | Retail / eCommerce |  |
| ABSYZ Software Consulting | 1 | Retail & eCommerce | Retail / eCommerce |  |
| accessmatrix | 1 | Software Provider | Software Provider (add to canonical?) |  |
| Accor | 3 | Travel & Hospitality | Hospitality |  |
| Ace Turtle | 2 | Retail & eCommerce | Retail / eCommerce |  |
| Acerto | 1 | Collecting | Collecting (add to canonical?) |  |
| Acko | 8 | BFSI | Banking | Yes |
| acko | 1 | BFSI | Banking | Yes |
| Act Fibernet | 1 | Software Provider | Software Provider (add to canonical?) |  |
| ADANI Labs | 1 | Software Provider | Software Provider (add to canonical?) |  |
| Adani Realty | 1 | Real Estate | Real Estate |  |
| ADBI Ai Agent | 1 | BFSI | Banking |  |
| Aditya Birla | 5 | BFSI | Banking | Yes |
| aditya birla | 1 | BFSI | Banking | Yes |
| Aditya Birla Capital Sun Life Insurance | 3 | BFSI | Banking |  |
| Aditya Birla Housing Finance | 3 | BFSI | Banking |  |
| Aditya Birla Sun Life Insurance | 1 | BFSI | Banking |  |
| AECC | 1 | Education | Education |  |
| Aegea Saneamento | 1 | Goverment | Gov / Citizen Services |  |
| Affolife Retail Pvt Ltd | 1 | Retail & eCommerce | Retail / eCommerce |  |
| Ageas federal | 1 | BFSI | Banking |  |
| ageasfederal | 1 | BFSI | Banking |  |
| agents | 1 |  |  |  |
| Agile telecom | 1 | Telecom | Telecom (add to canonical?) |  |
| agiletelecom | 1 | Telecom | Telecom (add to canonical?) | Yes |
| Agiletelecom | 1 | Telecom | Telecom (add to canonical?) | Yes |
| Agrim App | 1 | Retail & eCommerce | Retail / eCommerce |  |
| Agrosaf | 2 | Retail & eCommerce | Retail / eCommerce |  |
| Ahorro Service Now | 2 | Retail & eCommerce | Retail / eCommerce |  |
| AHS Windows | 1 | Manufacturing | Manufacturing (add to canonical?) |  |
| AI Growth | 1 | Software Provider | Software Provider (add to canonical?) |  |
| ai4Process | 1 | BFSI | Banking |  |
| AIG Hospital | 1 | Healthcare | Healthcare |  |
| airasia | 1 | Travel & Hospitality | Hospitality | Yes |
| AirAsia | 1 | Travel & Hospitality | Hospitality | Yes |
| Airtel | 1 | Telecom | Telecom (add to canonical?) |  |
| AIS Windows | 2 | Retail & eCommerce | Retail / eCommerce |  |
| aiwizelabs.com | 2 | Software Provider | Software Provider (add to canonical?) |  |
| Ajio | 1 | Retail & eCommerce | Retail / eCommerce |  |
| Ajman Bank | 2 | BFSI | Banking |  |
| Akshaykalpa | 2 | Retail & eCommerce | Retail / eCommerce |  |
| Al Ain Pharmacy | 1 | Healthcare | Healthcare |  |
| Al Borg | 1 | Healthcare | Healthcare |  |
| Al Essa | 2 | Retail & eCommerce | Retail / eCommerce | Yes |
| AL Essa | 1 | Retail & eCommerce | Retail / eCommerce | Yes |
| Al Essa - NOICE | 1 | Retail & eCommerce | Retail / eCommerce |  |

## 5. Win match categories (to apply after parsing Wins xlsx)

- **Strong (Green):** Win row’s account win/loss is fully understood and mapped: same account + SFDC link + activities in migration data linked.
- **Medium (Yellow):** Partially mapped: account or SFDC match but not all activities/projects linked.
- **Weak (Red):** Unmapped or unclear: no matching account in PAMS or no activities linked; needs manual review.

*Note:* The file `2025 Wins with SFDC-2026-02-02-17-56-23.xlsx` has a title/filter header section; the actual data table (Account, SFDC Id, Project, Win date, etc.) may start a few rows down. Once the table structure is confirmed, the script will assign Green/Yellow/Red per Win row and the migration UI will show these colours.

---

## 6. Special merge rules (confirmed)

- **Axis Bank MK** and **Axis Bank** → same account (merge all variants into "Axis Bank").
- **FedEx** (all variants) → one account "FedEx" with projects **APAC**, **LATAM** (add LAC if needed). Use **International account** checkbox so sales rep is at project level.
- **Webinars** → treat as **internal activities**; when matching migration data, consider both external and internal activities (not all rows are external).

## 7. International account

Checkbox at account level: **International account**. When checked, the relationship of sales rep moves to **project level** (each project has its own sales rep/region). Use for FedEx and other multi-region same-company accounts.

## 8. Section-level migration (for implementation)

1. **Account Level Data** – Alphabetical account list; Duplicates section (confirm merge / not); **International account** checkbox; best-fit Industry (this document) for validation.
2. **Project Level Data** – Map projects to accounts (e.g. APAC, LATAM for FedEx); project-level sales rep when account is International.
3. **Activity Level** – Map activities (external and internal; webinars = internal) to accounts and projects.

---

*Full list in `docs/migration-mapping-extract.json` (up to 500 accounts, 100 duplicate groups).*
