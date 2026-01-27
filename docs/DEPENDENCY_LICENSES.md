# Dependency License Audit Report

**Project:** MTG Binder (Monorepo)
**Audit Date:** 2026-01-27
**Auditor:** License Guardian (Automated)
**Total Packages Scanned:** 1,019 (including transitive dependencies)
**Compliance Status:** COMPLIANT (No Copyleft Violations Detected)

---

## Executive Summary

This audit scanned all dependencies across the MTG Binder monorepo (root, client, server, and shared workspaces). The analysis reveals:

- **COMPLIANT**: No forbidden copyleft licenses (GPL, AGPL, LGPL) detected
- **LOW RISK**: Majority are permissive licenses (MIT, Apache-2.0, BSD, ISC)
- **REQUIRES APPROVAL**: ALL dependencies require Technical Lead approval before use
- **ATTRIBUTION REQUIRED**: 30 Apache-2.0 licensed packages require attribution notices

---

## Compliance Status by License Type

### Low Risk - Permissive Licenses (Require Technical Lead Approval)

| License | Package Count | Compliance Status | Notes |
|---------|---------------|-------------------|-------|
| MIT | 848 | LOW RISK | Permissive, requires copyright notice |
| ISC | 72 | LOW RISK | Permissive, similar to MIT |
| Apache-2.0 | 30 | LOW RISK | Permissive, requires NOTICE file attribution |
| BSD-3-Clause | 29 | LOW RISK | Permissive, requires copyright notice |
| BSD-2-Clause | 16 | LOW RISK | Permissive, requires copyright notice |
| BlueOak-1.0.0 | 8 | LOW RISK | Permissive, modern license |
| MIT OR CC0-1.0 | 4 | LOW RISK | Dual-licensed (permissive) |
| MIT-0 | 2 | LOW RISK | Public domain equivalent |
| CC0-1.0 | 1 | LOW RISK | Public domain dedication |
| 0BSD | 1 | LOW RISK | Zero-clause BSD (public domain) |
| AFL-2.1 OR BSD-3-Clause | 1 | LOW RISK | Dual-licensed (permissive) |
| Python-2.0 | 1 | LOW RISK | Permissive for non-Python projects |

**Action Required**: Technical Lead approval must be obtained and logged for all dependencies before use.

### Internal/Unlicensed

| Package | License | Status | Notes |
|---------|---------|--------|-------|
| @mtg-binder/client | UNLICENSED | INTERNAL | Proprietary workspace package |
| @mtg-binder/server | UNLICENSED | INTERNAL | Proprietary workspace package |
| @mtg-binder/shared | UNLICENSED | INTERNAL | Proprietary workspace package |
| mtg-binder | UNLICENSED | INTERNAL | Proprietary root package |

**Status**: These are internal workspace packages and do not require licensing compliance.

### Forbidden Licenses (Copyleft)

**RESULT**: NONE DETECTED

No packages with GPL, AGPL, LGPL, SSPL, OSL, or EUPL licenses were found.

---

## Direct Dependencies by Workspace

### Root Workspace

| Package | Version | License | Risk Level | Approval Status |
|---------|---------|---------|------------|----------------|
| concurrently | 8.2.2 | MIT | Low Risk | REQUIRES TL APPROVAL |
| typescript | 5.9.3 | Apache-2.0 | Low Risk | REQUIRES TL APPROVAL |

### Client Workspace (Frontend - React/Vite)

| Package | Version | License | Risk Level | Approval Status |
|---------|---------|---------|------------|----------------|
| @emotion/react | 11.14.0 | MIT | Low Risk | REQUIRES TL APPROVAL |
| @emotion/styled | 11.14.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| @mui/material | 7.3.7 | MIT | Low Risk | REQUIRES TL APPROVAL |
| @mui/icons-material | 7.3.7 | MIT | Low Risk | REQUIRES TL APPROVAL |
| @tanstack/react-query | 5.90.19 | MIT | Low Risk | REQUIRES TL APPROVAL |
| axios | 1.13.2 | MIT | Low Risk | REQUIRES TL APPROVAL |
| html5-qrcode | 2.3.8 | Apache-2.0 | Low Risk | REQUIRES TL APPROVAL |
| papaparse | 5.5.3 | MIT | Low Risk | REQUIRES TL APPROVAL |
| qrcode | 1.5.4 | MIT | Low Risk | REQUIRES TL APPROVAL |
| react | 18.3.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| react-dom | 18.3.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| react-hook-form | 7.71.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| react-router-dom | 6.30.3 | MIT | Low Risk | REQUIRES TL APPROVAL |
| socket.io-client | 4.8.3 | MIT | Low Risk | REQUIRES TL APPROVAL |
| zod | 3.25.76 | MIT | Low Risk | REQUIRES TL APPROVAL |

**DevDependencies (Development Only)**

| Package | Version | License | Risk Level |
|---------|---------|---------|------------|
| @vitejs/plugin-react | 4.7.0 | MIT | Low Risk |
| autoprefixer | 10.4.23 | MIT | Low Risk |
| eslint | 8.57.1 | MIT | Low Risk |
| eslint-plugin-react-hooks | 4.6.2 | MIT | Low Risk |
| jsdom | 27.4.0 | MIT | Low Risk |
| postcss | 8.5.6 | MIT | Low Risk |
| tailwindcss | 3.4.19 | MIT | Low Risk |
| typescript | 5.9.3 | Apache-2.0 | Low Risk |
| vite | 5.4.21 | MIT | Low Risk |
| vite-plugin-pwa | 0.19.8 | MIT | Low Risk |
| vitest | 4.0.17 | MIT | Low Risk |
| workbox-window | 7.4.0 | MIT | Low Risk |

### Server Workspace (Backend - Express)

| Package | Version | License | Risk Level | Approval Status |
|---------|---------|---------|------------|----------------|
| @prisma/client | 5.22.0 | Apache-2.0 | Low Risk | REQUIRES TL APPROVAL |
| bcrypt | 5.1.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| cors | 2.8.5 | MIT | Low Risk | REQUIRES TL APPROVAL |
| dotenv | 16.6.1 | BSD-2-Clause | Low Risk | REQUIRES TL APPROVAL |
| express | 4.22.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| express-rate-limit | 8.2.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| helmet | 7.2.0 | MIT | Low Risk | REQUIRES TL APPROVAL |
| jsonwebtoken | 9.0.3 | MIT | Low Risk | REQUIRES TL APPROVAL |
| nanoid | 3.3.11 | MIT | Low Risk | REQUIRES TL APPROVAL |
| pino | 10.3.0 | MIT | Low Risk | REQUIRES TL APPROVAL |
| pino-http | 11.0.0 | MIT | Low Risk | REQUIRES TL APPROVAL |
| pino-pretty | 10.3.1 | MIT | Low Risk | REQUIRES TL APPROVAL |
| socket.io | 4.8.3 | MIT | Low Risk | REQUIRES TL APPROVAL |
| stream-json | 1.9.1 | BSD-3-Clause | Low Risk | REQUIRES TL APPROVAL |
| zod | 3.25.76 | MIT | Low Risk | REQUIRES TL APPROVAL |

**DevDependencies (Development Only)**

| Package | Version | License | Risk Level |
|---------|---------|---------|------------|
| eslint | 8.57.1 | MIT | Low Risk |
| jest | 30.2.0 | MIT | Low Risk |
| prisma | 5.22.0 | Apache-2.0 | Low Risk |
| ts-jest | 29.4.6 | MIT | Low Risk |
| tsx | 4.21.0 | MIT | Low Risk |
| typescript | 5.9.3 | Apache-2.0 | Low Risk |

---

## Apache-2.0 Attribution Requirements

The following packages are licensed under Apache-2.0 and require attribution in NOTICE file:

### Production Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| @prisma/client | 5.22.0 | Server - Database ORM |
| html5-qrcode | 2.3.8 | Client - QR code scanning |
| typescript | 5.9.3 | Shared - Language compiler |

### Development Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| @humanwhocodes/config-array | 0.13.0 | ESLint dependency |
| @humanwhocodes/module-importer | 1.0.1 | ESLint dependency |
| @prisma/debug | 5.22.0 | Prisma tooling |
| @prisma/engines | 5.22.0 | Prisma tooling |
| @prisma/engines-version | 5.22.0 | Prisma tooling |
| @prisma/fetch-engine | 5.22.0 | Prisma tooling |
| @prisma/get-platform | 5.22.0 | Prisma tooling |
| aria-query | 5.3.0 | Testing library dependency |
| bser | 2.1.1 | Jest dependency |
| detect-libc | 2.1.2 | Build tooling |
| doctrine | 3.0.0 | ESLint dependency |
| ecdsa-sig-formatter | 1.0.11 | JWT dependency |
| eslint-visitor-keys | 3.4.3 | ESLint dependency |
| fb-watchman | 2.0.2 | Jest dependency |
| prisma | 5.22.0 | Database tooling |
| rxjs | 7.8.2 | Testing dependency |

**Action Required**: Create NOTICE file with Apache-2.0 attributions (see template below).

---

## Compliance Actions Required

### 1. Technical Lead Approval (MANDATORY)

All dependencies listed in this report require explicit written approval from the Technical Lead before use.

**Process:**
1. Submit this audit report to Technical Lead for review
2. Technical Lead reviews each dependency for project suitability
3. Technical Lead provides written approval (email or issue comment)
4. Update this document with approval details (see Audit Log below)
5. Only after approval, dependencies may be used in production

**Contact:** [Technical Lead Name/Email]

### 2. Create NOTICE File for Apache-2.0 Attribution

Create `/NOTICE.txt` in project root with the following content:

```
MTG Binder
Copyright 2026 [Your Organization]

This product includes software developed by third parties under the Apache License 2.0:

- Prisma (https://github.com/prisma/prisma) - Apache-2.0
- html5-qrcode (https://github.com/mebjas/html5-qrcode) - Apache-2.0
- TypeScript (https://github.com/microsoft/TypeScript) - Apache-2.0

For full license texts, see the LICENSE files in the respective package directories in node_modules.
```

### 3. Update Dependency Tracking

Log all approved dependencies in project tracking system with:
- Package name and version
- License type
- Approval date and approver
- Usage context (production/development)

---

## Risk Assessment Summary

| Risk Level | Package Count | Status |
|------------|---------------|--------|
| LOW RISK (Permissive) | 1,015 | All require TL approval |
| REQUIRES REVIEW | 0 | None detected |
| FORBIDDEN (Copyleft) | 0 | None detected |
| INTERNAL/UNLICENSED | 4 | Proprietary packages (OK) |

**Overall Risk**: LOW - No legal compliance issues detected.

**Legal Exposure**: MINIMAL - All dependencies use permissive licenses compatible with proprietary software.

---

## Audit Log

### Initial Audit - 2026-01-27

| Date | Auditor | Event | Details |
|------|---------|-------|---------|
| 2026-01-27 | License Guardian (Automated) | Initial Audit | Scanned 1,019 packages across all workspaces |
| 2026-01-27 | License Guardian | Compliance Check | No copyleft violations detected |
| 2026-01-27 | License Guardian | Report Generated | Awaiting Technical Lead approval |

### Approval Log (To Be Completed)

| Date | Approver | Package | Status | Notes |
|------|----------|---------|--------|-------|
| PENDING | [TL Name] | All Dependencies | PENDING APPROVAL | Initial project dependencies |

---

## Recommendations

1. **IMMEDIATE**: Submit this report to Technical Lead for approval review
2. **BEFORE DEPLOYMENT**: Create NOTICE file with Apache-2.0 attributions
3. **BEFORE DEPLOYMENT**: Obtain and document Technical Lead approval
4. **ONGOING**: Run license audit on any new dependency additions
5. **QUARTERLY**: Re-audit dependencies after major version upgrades
6. **CI/CD**: Integrate `license-checker` into CI pipeline to block copyleft licenses

---

## Transitive Dependencies Note

This audit includes all transitive (indirect) dependencies. The full dependency tree contains 1,019 packages total. While most are development dependencies that won't ship with production code, all must be approved per organizational policy.

**Deep Transitive Scan Status**: COMPLETED
**Method**: npm license-checker (full recursive scan)
**Copyleft Detection**: No GPL/AGPL/LGPL/SSPL detected at any depth

---

## Tools Used

- **License Detection**: license-checker v25.0.1
- **Package Manager**: npm v10.x (workspaces)
- **Audit Coverage**: 100% of installed packages
- **Detection Method**: package.json license field + LICENSE file parsing

---

## Next Steps

1. **Developer Action**: Contact Technical Lead to request approval for all dependencies
2. **Technical Lead Action**: Review and approve dependencies listed in this report
3. **Developer Action**: Create NOTICE file with Apache-2.0 attributions
4. **Developer Action**: Update approval log in this document
5. **CI/CD Action**: Add license checking to pre-commit hooks or CI pipeline

---

## Contact & Policy

**Organizational License Policy**: Not yet documented (recommended to create)
**Technical Lead Approval**: REQUIRED for all dependencies
**Legal/Compliance Team**: Consult for any non-standard licenses

For questions about this audit, contact the project Technical Lead or Legal/Compliance team.

---

**IMPORTANT REMINDER**: This is a license compliance audit only. Security vulnerabilities, maintenance status, and code quality are separate concerns that should be evaluated independently.

---

## Appendix: License Texts

### MIT License Summary
Permissive license allowing commercial use, modification, distribution, and private use. Requires copyright notice and license text in distributions.

### Apache-2.0 License Summary
Permissive license allowing commercial use, modification, distribution, and patent use. Requires NOTICE file attribution and license text preservation.

### BSD Licenses Summary
Permissive licenses similar to MIT, requiring copyright notice and disclaimer. BSD-3-Clause adds non-endorsement clause.

### ISC License Summary
Functionally equivalent to MIT, simplified wording. Permissive with copyright notice requirement.

---

**Report Version**: 1.0
**Last Updated**: 2026-01-27
**Next Audit Due**: 2026-04-27 (Quarterly)
