# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
HR Managers, HR Administrators, and Employees across corporate divisions in Indonesia.

## Product Purpose
SATIVA (BelajarVibe) is a privacy-preserved organizational attendance & collective mental wellbeing dashboard. It combines GPS location check-ins with anonymous sentiment analysis to track team health, burnout risks, and attendance correlations without compromising employee privacy.

## Positioning
SATIVA offers real-time attendance tracking combined with encrypted, privacy-preserved psychological climate monitoring for corporate teams (requiring >= 5 respondents per division to aggregate sentiment).

## Operating Context
Used daily by employees for morning clock-ins and afternoon clock-outs (with mood feedback), and by HR admins to evaluate division-level attendance trends, burnout risks, and organization management.

## Capabilities and Constraints
- Real-time GPS location check-in (100m radius or dev fallback)
- Anonymous wellbeing feedback collection at clock-out
- Dynamic division creation & employee invitation via SMTP email
- Privacy restriction: Sentiment analytics only aggregate when division respondents >= 5
- Multi-role access control (HR/Admin vs Karyawan)

## Brand Commitments
- App Name: SATIVA (Sistem Absensi & Kesehatan Tim BelajarVibe)
- Visual Style: Modern dark glassmorphic design system (#102636 background, #a0d4e4 cyan/teal accents, semi-transparent frosted glass panels)
- Language Support: Indonesian (ID) primary, English (EN) secondary

## Evidence on Hand
- Full Next.js frontend codebase with Tailwind CSS, Lucide icons, and Recharts.
- NestJS backend with Prisma database, JWT authentication, and Nodemailer email integration.

## Product Principles
1. **Privacy First**: Individual sentiment scores and journal notes are strictly anonymized and encrypted.
2. **Visual Craft & Polish**: Impeccable dark glassmorphism layout with clear visual hierarchy, crisp typography, and responsive controls.
3. **Simplicity & Efficiency**: Sidebar navigation for zero-clutter scanning and streamlined HR workflows.

## Accessibility & Inclusion
- High contrast text on dark glass panels.
- Semantic HTML tags, clear interactive button labels, and responsive layout bounds.
