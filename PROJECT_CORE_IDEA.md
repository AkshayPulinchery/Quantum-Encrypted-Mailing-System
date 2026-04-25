# Quantum-Encrypted Mailing System (CuteMail) - Core Idea and Analysis

## Core Idea: Zero-Knowledge, Post-Quantum Secure Email
The fundamental philosophy behind **CuteMail** is absolute privacy via a **zero-knowledge architecture**. The platform aims to provide a secure email exchange system where the central server (backend) knows absolutely nothing about the contents of the emails it stores or routes.

To achieve this, the project relies on **client-side End-to-End Encryption (E2EE)**, uniquely emphasizing **post-quantum cryptography**. This means the cryptographic algorithms intended to secure the communication are designed to be secure against the theoretical code-breaking capabilities of future quantum computers.

### The Zero-Knowledge Principle in Practice
- **Opaque Storage:** The backend database stores email subjects and bodies strictly as encrypted string blobs (`subject_encrypted`, `body_encrypted`).
- **No Private Keys:** The server only stores corresponding **public keys** for each user. Private keys are never transmitted to or stored on the server.
- **Symmetric Key Wrapping:** Each email is encrypted with a unique, one-time symmetric key. This symmetric key is then itself encrypted using the recipient's public key (stored as `encrypted_key`). Only the recipient, holding the private key, can unwrap the symmetric key and subsequently decrypt the email. The backend cannot read anything.

---

## Project Architecture & Current Implementation State

### 1. Backend (Django REST Framework) - *Fully Implemented*
Built with Python using Django and Django REST Framework, the backend essentially serves as a highly secure, "dumb" storage and routing node.

**Key Components:**
*   **Accounts (`accounts/`):** Handles user registration, JWT-based authentication, and public key distribution. When a user registers, their client submits a `public_key` which other users will query to send them mail.
*   **Mails (`mails/`):** Manages the storage and retrieval of the encrypted emails. The server enforces strict REST permissions so only the verified sender and receiver can ever fetch an email record.
*   **AI Tools (`ai_tools/`):** Provides AI-driven features (email generation, rewriting, summarizing, and spam checking). Because the server is zero-knowledge, features like "summarization" require the frontend client to first decrypt the email locally and send the plaintext to the server's AI endpoint temporarily. The server is designed to process these prompts in-memory and discard them immediately—never saving the plaintext to the database. It supports real OpenAI integration or a fallback "mock mode."

### 2. Frontend (Next.js with TypeScript) - *Barely Started*
The frontend is built on Next.js but is currently just the default framework boilerplate.
Once fully built, its critical responsibilities will include:
*   Generating the robust post-quantum keypairs directly on the client's device.
*   Encrypting outgoing emails using the recipient's public key *before* transmitting the request.
*   Decrypting incoming emails locally using the user's private key.
*   Interacting securely with the AI endpoints.

---

## The End-to-End Flow (How it works)
1. **Registration:** Alice generates a post-quantum public/private keypair in her browser. She registers with the server, sending only her `public_key`. Her `private_key` stays securely on her device.
2. **Sending an Email:** Bob wants to email Alice. Bob's client fetches Alice's `public_key` from the server. Bob's client encrypts the email content, and sends *only* the ciphertext payload to the backend.
3. **Receiving an Email:** Alice logs in and fetches her inbox. Her client downloads the raw encrypted payloads and uses her local `private_key` to decrypt the content seamlessly on her screen. The backend server remains completely unaware of the message's actual contents.
