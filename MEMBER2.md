# 👤 Member 2 Responsibilities – CuteMail Backend

## 🧠 Role Summary

You are responsible for building the **backend system** of CuteMail.

> Your job is to manage users, store encrypted emails, and provide APIs (including AI) — without ever accessing real message content.

---

# 🎯 Core Responsibilities

## 1. 🔐 Authentication System

Build:

* User Registration
* User Login
* JWT Authentication

### Store:

* Email
* Password (hashed)
* Public Key

### Never Store:

* Private Key ❌

---

## 2. 👤 User Management

Responsibilities:

* Create users
* Fetch users by email
* Provide public key access

### API:

```
GET /api/users/public-key/<email>
```

---

## 3. 📩 Email Storage (Encrypted Only)

You must:

* Receive encrypted emails
* Store them securely
* Return encrypted data

### Example Stored Data:

```json
{
  "subject_encrypted": "...",
  "body_encrypted": "...",
  "encrypted_key": "...",
  "sender": "...",
  "receiver": "..."
}
```

### Strict Rules:

* Do NOT decrypt ❌
* Do NOT read content ❌

---

## 4. 📬 Inbox & Sent APIs

Build APIs:

```
GET /api/mails/inbox
GET /api/mails/sent
```

Return only encrypted data.

---

## 5. 🤖 AI Endpoints

Create:

```
POST /api/ai/generate-email
POST /api/ai/rewrite
POST /api/ai/summarize
POST /api/ai/spam-check
```

### Your Job:

* Call AI API (OpenAI or mock)
* Return results to frontend

### Important:

* Only process user-approved text
* Never access encrypted inbox

---

## 6. 🗄️ Database Design

### User Table:

* email
* password
* public_key

### Email Table:

* sender
* receiver
* encrypted fields
* timestamps

---

## 7. 🔐 Backend Security

Implement:

* JWT authentication
* Password hashing
* Input validation
* CORS handling

---

# ⚠️ What is NOT Your Job

Do NOT handle:

* Encryption logic ❌ (Member 3)
* Decryption ❌
* Private keys ❌
* Frontend UI ❌ (Member 1)
* Blockchain/IPFS (for MVP) ❌
