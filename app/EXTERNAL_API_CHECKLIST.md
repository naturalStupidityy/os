# VKumbh External API Dependency Checklist

## Overview
The following features require external third-party APIs that **are NOT implemented** in this system. These have been left out because they require external service accounts, API keys, and payment/setup with third-party vendors.

---

## 1. SMS Gateway (OTP via Real SMS)
**Status:** NOT IMPLEMENTED  
**Reason:** Requires integration with an SMS service provider (Twilio, Msg91, AWS SNS, etc.)  
**Impact:** OTP verification currently uses a hardcoded demo value ("123456")  
**What's in place:** Rate limiting on OTP requests (5 per 10 minutes per phone)  
**To implement:**
- Sign up with an SMS provider (e.g., Twilio, Msg91, Exotel)
- Add `SMS_API_KEY`, `SMS_SENDER_ID` to environment variables
- Replace the hardcoded OTP generation in `api/routers/auth.ts` with actual SMS send logic
- Update the `requestOTP` mutation to call the SMS API

---

## 2. WhatsApp Notifications
**Status:** NOT IMPLEMENTED  
**Reason:** Requires WhatsApp Business API access via Meta or a provider like Twilio  
**Impact:** No WhatsApp messages are sent for attendance, exam, or certificate notifications  
**What's in place:** Config flag `notifications.whatsapp_enabled` exists in system config  
**To implement:**
- Apply for WhatsApp Business API through Meta or a provider (Twilio, Gupshup)
- Add `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID` to environment variables
- Create notification templates in the WhatsApp Business Manager
- Implement a notification service that calls the WhatsApp API

---

## 3. Email Service (SMTP/Email API)
**Status:** NOT IMPLEMENTED  
**Reason:** Requires SMTP credentials or an email service (SendGrid, AWS SES, etc.)  
**Impact:** No email notifications sent for registration, exam results, or certificate issuance  
**What's in place:** Config flag exists but no email sending logic  
**To implement:**
- Sign up with an email service (SendGrid, AWS SES, Mailgun)
- Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` to environment variables
- Implement email templates for registration confirmation, exam results, certificate download
- Add email sending calls to relevant tRPC mutations

---

## 4. Push Notifications (Firebase Cloud Messaging)
**Status:** NOT IMPLEMENTED  
**Reason:** Requires Firebase project setup and client-side service worker  
**Impact:** No push notifications for session reminders or exam availability  
**To implement:**
- Create a Firebase project and get server key
- Add `FIREBASE_SERVER_KEY` to environment variables
- Implement Firebase Cloud Messaging integration on the backend
- Add service worker and notification permission logic on the frontend

---

## 5. Aadhaar Verification (eAadhaar/UIDAI)
**Status:** NOT IMPLEMENTED  
**Reason:** Requires authorized access to UIDAI's Aadhaar Authentication API  
**Impact:** Registration does not verify Aadhaar identity  
**What's in place:** Config flag `registration.require_aadhaar` exists but not enforced  
**To implement:**
- Apply for Aadhaar Authentication API access through UIDAI
- Complete the security audit and compliance requirements
- Add Aadhaar number field and OTP-based verification flow to registration

---

## 6. Certificate PDF Generation
**Status:** PARTIALLY IMPLEMENTED (JSON download only)  
**Reason:** PDF generation libraries (Puppeteer, jsPDF) add significant bundle size  
**Impact:** Certificates are downloaded as JSON, not as styled PDFs  
**What's in place:** Certificate data structure, issuance logic, and download endpoint  
**To implement:**
- Install a PDF generation library (Puppeteer for server-side, or jsPDF for client-side)
- Design a certificate template with official branding
- Implement PDF generation in the certificate download endpoint

---

## 7. Real-Time Location/GPS Tracking
**Status:** NOT IMPLEMENTED  
**Reason:** Requires frontend geolocation permissions and backend storage for coordinates  
**Impact:** Attendance records store latitude/longitude fields but are not populated  
**What's in place:** Database fields exist for latitude and longitude in attendance records  
**To implement:**
- Add geolocation API call in the QR scanner component
- Send coordinates with the check-in mutation
- Optionally add a map view for admin to see volunteer distribution

---

## 8. Photo Upload (Cloud Storage)
**Status:** NOT IMPLEMENTED  
**Reason:** Requires cloud storage service (AWS S3, Cloudflare R2, etc.)  
**Impact:** Volunteer profiles do not support photo uploads  
**To implement:**
- Set up cloud storage bucket with public read access
- Add `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` to environment variables
- Implement file upload endpoint with image validation
- Add file upload component to registration and profile pages

---

## Summary Table

| # | Feature | Status | Effort | Cost |
|---|---------|--------|--------|------|
| 1 | SMS Gateway | Not Implemented | Medium | $$ (per SMS) |
| 2 | WhatsApp Notifications | Not Implemented | High | $$ (per message) |
| 3 | Email Service | Not Implemented | Low | Free tier available |
| 4 | Push Notifications | Not Implemented | Medium | Free (Firebase) |
| 5 | Aadhaar Verification | Not Implemented | Very High | Government process |
| 6 | Certificate PDF Generation | Partially Implemented | Medium | Free (open source) |
| 7 | GPS Location Tracking | Not Implemented | Low | Free (browser API) |
| 8 | Photo Upload | Not Implemented | Medium | $ (storage costs) |

---

## Recommendation Priority

### High Priority (Core functionality)
1. **Certificate PDF Generation** - Essential for demo credibility
2. **Email Service** - Low cost, high value for user communication

### Medium Priority (Nice to have)
3. **SMS Gateway** - Makes OTP flow production-ready
4. **GPS Location Tracking** - Uses free browser API, easy to add

### Low Priority (Future enhancements)
5. **Push Notifications** - Requires more infrastructure
6. **WhatsApp Notifications** - Expensive per-message cost
7. **Photo Upload** - Nice for profiles but not critical
8. **Aadhaar Verification** - Lengthy government approval process
