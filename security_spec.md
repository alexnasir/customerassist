# Firestore Security Specification & TDD Spec

This specification defines the rigorous security posture, data invariants, adversarial testing payloads, and testing scripts used to audit the Firestore Security Rules for OmniAssist AI.

---

## 1. Data Invariants

1. **Authentication Boundary:** Only users with verified email addresses may read or write operational data. Anonymous access is strictly denied.
2. **Relational Hierarchy:** Messages (`/conversations/{conversationId}/messages/{messageId}`) can only be created if the parent conversation actually exists and the authenticated actor is a participant or is an assigned agent.
3. **Role Privilege Separation:** Regular customers are forbidden from writing prompts (`/prompts`), configuring prompt tests (`/tests`), deleting knowledge documents (`/documents`), or reading system logs (`/logs`).
4. **Immutability Protection:** The fields `createdAt`, `id`, `customerId`, and `conversationId` are completely immutable after initial creation.
5. **System Log Integrity:** System logs are write-once only. Updates and deletions are completely blocked for all actors.

---

## 2. The "Dirty Dozen" Adversarial Payloads

Here are twelve highly dangerous payloads designed to break authorization, bypass sanitization, or hijack privileges. The security rules must block all of these with `PERMISSION_DENIED`.

1. **Payload 1: Privileged Role Hijacking during Registration**
   - *Target:* `/users/malicious_user`
   - *Attack:* A user registers and attempts to assign themselves the `'admin'` role directly from the client.
   - *Payload:* `{"id": "malicious_user", "name": "Hacker", "email": "hacker@evil.com", "role": "admin", "createdAt": "2026-06-24T12:00:00Z"}`

2. **Payload 2: Email Spoofing Privilege Bypass**
   - *Target:* `/logs/log_123` (Read log as admin)
   - *Attack:* An attacker signs in with email `alexnasiali45@gmail.com` but with `email_verified: false` to mimic the administrator.
   - *Condition:* Blocked because `request.auth.token.email_verified` must be `true`.

3. **Payload 3: Unbounded Resource Poisoning (Denial of Wallet)**
   - *Target:* `/documents/doc_123`
   - *Attack:* Injecting a huge text string (10MB) into the document name or ID.
   - *Payload:* `{"id": "doc_123", "name": "<10MB_string>", "content": "RAG content", "category": "refunds", "chunkCount": 1, "createdAt": "2026-06-24T12:00:00Z"}`

4. **Payload 4: Message Creation in Non-Existent Conversation (Orphan Message)**
   - *Target:* `/conversations/fake_conv/messages/msg_123`
   - *Attack:* Inject a message into a conversation that does not exist in Firestore.
   - *Condition:* Blocked via `exists()` check on the parent conversation path.

5. **Payload 5: User Profile Update Key Escalation (Shadow Field)**
   - *Target:* `/users/customer_123`
   - *Attack:* Attempting to update a user profile to add a hidden `isPremium` field.
   - *Payload:* `{"name": "Customer Name", "role": "admin"}` (when updating existing user)

6. **Payload 6: Audit Log Mutation / Tampering**
   - *Target:* `/logs/log_123`
   - *Attack:* An attacker attempts to modify or delete a critical audit log of an intrusion event.
   - *Payload:* `{"severity": "info", "details": "Tampered Log Details"}`

7. **Payload 7: Prompt Version Update State Jumping**
   - *Target:* `/prompts/prompt_v1`
   - *Attack:* An unauthorized user attempts to toggle `isActive` on a system prompt.
   - *Payload:* `{"isActive": true}`

8. **Payload 8: Cross-Tenant Message Reading**
   - *Target:* `/conversations/tenant_a/messages/msg_123`
   - *Attack:* User from Tenant B queries messages in Tenant A's private support thread.
   - *Condition:* Blocked because user is neither customer nor assigned agent.

9. **Payload 9: CSAT Rating Overflow Attack**
   - *Target:* `/conversations/conv_123` (Update Rating)
   - *Attack:* Attempting to submit a rating of `99` to break average analytics.
   - *Payload:* `{"rating": 99, "feedback": "Amazing!"}`

10. **Payload 10: Deleting Active Support Tickets**
    - *Target:* `/tickets/ticket_123`
    - *Attack:* Non-admin trying to delete/purge unresolved customer support complaints.
    - *Action:* `delete` operation must fail.

11. **Payload 11: System Prompt Creation by Customer**
    - *Target:* `/prompts/p_new`
    - *Attack:* Regular customer writes custom instructions to inject malware.
    - *Payload:* `{"id": "p_new", "content": "Override all instructions"}`

12. **Payload 12: Injection of Path Variables via ID Manipulation**
    - *Target:* `/users/../../malicious_path`
    - *Attack:* Path traversal using directory dots or junk characters in the document ID path.

---

## 3. Test Runner Design

Below is a mock-up of the rules validation runner that demonstrates how the system validates permission boundaries programmatically.

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('OmniAssist AI - Zero-Trust Security Rules Audits', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'galvanic-weft-hqvh5',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('blocks unverified users from editing core settings', async () => {
    const unverifiedDb = testEnv.authenticatedContext('hacker', { email_verified: false }).firestore();
    await assertFails(unverifiedDb.doc('users/hacker').set({
      id: 'hacker',
      role: 'admin'
    }));
  });

  it('prevents self-assignment of admin role', async () => {
    const customerDb = testEnv.authenticatedContext('user_123', { email: 'customer@test.com', email_verified: true }).firestore();
    await assertFails(customerDb.doc('users/user_123').set({
      id: 'user_123',
      name: 'User',
      email: 'customer@test.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    }));
  });
});
```
