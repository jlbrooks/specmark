// Pre-made annotations for first-time visitors
// These demonstrate the annotation workflow on the sample markdown

export const SAMPLE_ANNOTATIONS = [
  {
    id: 'sample-1',
    selectedText: 'secure, scalable solution',
    comment: "What's the target scale? 1M users? Consider adding specific numbers.",
    timestamp: Date.now(),
    range: { start: 147, end: 172 },
  },
  {
    id: 'sample-2',
    selectedText: '99.9% uptime SLA',
    comment: 'Ambitious for MVP. Start with 99.5% and increase after stability.',
    timestamp: Date.now(),
    range: { start: 603, end: 619 },
  },
  {
    id: 'sample-3',
    selectedText: 'Should we support biometric authentication?',
    comment: 'Yes - recommend WebAuthn/FIDO2 for future-proofing.',
    timestamp: Date.now(),
    range: { start: 1069, end: 1112 },
  },
]
