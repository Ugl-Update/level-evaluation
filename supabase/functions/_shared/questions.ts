// Shared question bank — single source of truth for Edge Functions.
// get-questions strips `correct` (and listening `script`) before sending to the browser.
// submit-assessment uses the full bank to grade server-side.
//
// NOTE: in the Supabase dashboard each function carries its OWN copy of this file at
// `<function>/_shared/questions.ts`. In this repo it lives once; when pasting to the
// dashboard, copy it into each function that imports it (get-questions, submit-assessment).

export type Question = {
  id: string;
  text: string;
  options: string[];
  correct: number;
};

export type ListeningItem = {
  id: string;
  script: string;
  audioFile: string;
  question: string;
  question2?: string;   // optional second written box; answer stored under `${id}b`
  type: 'mcq' | 'written';
  options?: string[];
  correct?: number;
};

export type SpeakingItem = {
  id: string;
  prompt: string;            // on-screen instruction the candidate reads
  type?: 'text' | 'call';    // 'call' items play a broker-voice clip before recording
  script?: string;           // broker's spoken words (admin transcript only; stripped from candidate)
  audioFile?: string;        // path to the broker-call clip for 'call' items
};

export const QUESTION_BANK: Record<string, { vocab: Question[]; premises: Question[] }> = {
  intermediate: {
    vocab: [
      { id: 'IV_RC', text: 'A rate confirmation is:', options: ['A shipper\'s internal packing list for the freight', 'A driver\'s daily log of hours and miles', 'A legally binding pay agreement between broker and carrier; the broker must provide it for the carrier to sign before proceeding', 'An optional quote that either side can change after pickup'], correct: 2 },
      { id: 'IV_WT', text: 'On a standard 5-axle tractor-trailer, the legal weight limits are:', options: ['Maximum gross 80,000 lbs — about 12,000 on the steer axle, 34,000 on the drives, and 34,000 on the trailer tandems', 'Maximum gross 80,000 lbs, all of it allowed on a single axle', 'Maximum gross 100,000 lbs with no per-axle limit', 'There is no legal maximum as long as the load is sealed'], correct: 0 },
      { id: 'IV_OO', text: 'An owner-operator is someone who:', options: ['Is an employee paid per mile in the company\'s truck', 'Drives a truck leased from a carrier and pays its costs — payments, fuel, repairs, fuel tax; the appeal is "instant ownership" with a small down payment', 'Books loads as a broker but never drives a truck', 'Owns the truck and runs the business, and keeps more of the revenue'], correct: 3 },
      { id: 'IV1', text: '"SLC" on a bill of lading stands for:', options: ['Sealed Load Confirmation', 'Shipper Load & Count', 'Standard Load Charge', 'Shipping Label Code'], correct: 1 },
      { id: 'IV2', text: '"OS&D" means:', options: ['Order Sent & Delivered', 'On-Site Delivery', 'Official Shipment Document', 'Over, Short, or Damaged'], correct: 3 },
      { id: 'IV3', text: '"TONU" stands for:', options: ['Truck Order Not Used', 'Trailer On No Update', 'Tracking Order Number', 'Total Order Not Unloaded'], correct: 0 },
      { id: 'IV4', text: '"FCFS" at a stop means:', options: ['A set appointment time', 'First come, first served — no set time', 'Fast Check First Service', 'Final Confirmation From Shipper'], correct: 1 },
      { id: 'IV5', text: '"PTI" stands for:', options: ['Paperwork Tracking Index', 'Pickup Time Indicator', 'Pre-Trip Inspection', 'Power Trailer Inspection'], correct: 2 },
    ],
    premises: [],
  },
  advanced: {
    vocab: [
      { id: 'AV1', text: 'On a rate confirmation, "Reefer 53" refers to:', options: ['A reefer set to 53 degrees', '53 pallets of refrigerated freight', 'A 53-foot refrigerated trailer — the length, not a temperature', 'A 53-minute cooling cycle'], correct: 2 },
      { id: 'AV2', text: 'A "PULP" temperature reading is:', options: ['The temperature shown on the reefer display', 'A physical probe reading taken inside the product itself', 'The outside air temperature at the dock', 'The setpoint listed on the RC'], correct: 1 },
      { id: 'AV3', text: '"Net 30" on a rate confirmation means:', options: ['You have 30 days to accept the load', 'The load is 30 miles long', 'You get a 30 percent rate increase', 'You are paid 30 days after the broker receives your paperwork'], correct: 3 },
      { id: 'AV4', text: '"Power Only" means:', options: ['You supply the tractor only and pull the broker\'s or shipper\'s trailer', 'The truck has no working brakes', 'Only electronic logs are used', 'A discounted flat rate'], correct: 0 },
      { id: 'AV5', text: 'Accessorial charges (detention, tarps, layover) must be:', options: ['Paid by the driver', 'Added automatically to every load', 'Pre-approved by the broker in writing', 'Ignored unless over 500 dollars'], correct: 2 },
    ],
    premises: [
      { id: 'AP1', text: 'A load was canceled by the broker right before pickup, after the truck had already been dispatched to the shipper. From the broker, dispatch should request:', options: ['A full line-haul payment as if delivered', 'A TONU (Truck Order Not Used)', 'A detention charge for the wasted time', 'Nothing — a cancelled load is never billable'], correct: 1 },
      { id: 'AP3', text: 'A broker verbally promises an extra $150 to tarp the load, but it is not written on the rate confirmation. Before the driver tarps, dispatch should:', options: ['Have the driver tarp now and argue the charge later', 'Add $150 to the invoice without telling the broker', 'Refuse the load because the RC is wrong', 'Get the accessorial pre-approved by the broker in writing first'], correct: 3 },
    ],
  },
};

export type WrittenItem = {
  id: string;
  prompt: string;
};

export const WRITTEN_PROMPTS: Record<string, WrittenItem[]> = {
  advanced: [
    {
      id: 'AW_slc',
      prompt: 'The driver sent the pickup pictures, but only sent a photo of the trailer with the seal on it plus the paperwork (PPW). When you asked him for the load and securement pictures, he told you the shipper loaded and sealed the trailer himself, and the BOL has SLC (Shipper Load & Count) written on it.\n\nWrite the exact email you would send to the broker in this case.',
    },
    {
      id: 'AW_reefer',
      prompt: 'The driver sent the pickup pictures. The BOL says the temperature must be 34°F, but the rate confirmation says to set it at 24°F, and the product pulp temperature is showing 67°F.\n\nWrite the exact email you would send to the broker in this case.',
    },
    {
      id: 'AW_airbags',
      prompt: 'The driver sent the pickup pictures. The load needs airbags for securement, and the driver already asked the shipper — they don\'t have any airbags.\n\nWrite the exact email you would send to the broker in this case.',
    },
  ],
};

export const LISTENING: ListeningItem[] = [
  {
    id: 'L1',
    type: 'mcq',
    script: "Hi, this is Mike from Arrive Logistics. Your driver needs to be docked fifteen minutes early, and please confirm the seal is on the correct door before pickup.",
    audioFile: 'audio/L1.wav',
    question: 'What does the broker want before pickup?',
    options: [
      'The driver docked 15 minutes early; seal confirmation can wait until after loading',
      'The driver docked 15 minutes early, and the seal confirmed on the correct door',
      'Confirm the seal is on the correct door; arrival time is flexible',
      'Arrive at the appointment window and send a seal photo after pickup',
    ],
    correct: 1,
  },
  {
    id: 'L2',
    type: 'written',
    script: "This load is Power Only. You'll pull our trailer, not your own. Call dispatch to get the trailer number before you hook.",
    audioFile: 'audio/L2.wav',
    question: 'In your own words, what must the driver do on this Power Only load before hooking?',
    question2: 'Why does it matter?',
  },
  {
    id: 'L3',
    type: 'mcq',
    script: "The rate is twelve hundred flat, plus two hundred fifty for MacroPoint. Read every line — don't just look at the total.",
    audioFile: 'audio/L3.wav',
    question: 'What is the total pay on this load?',
    options: [
      '1,200 dollars — the flat rate is all-in',
      '1,250 dollars — flat rate plus a partial tracking fee',
      '1,450 dollars',
      '1,050 dollars — MacroPoint is deducted from the flat rate',
    ],
    correct: 2,
  },
  {
    id: 'L5',
    type: 'mcq',
    script: 'Reefer fifty-three, temperature thirty-six degrees, continuous mode.',
    audioFile: 'audio/L5.wav',
    question: 'What temperature should the reefer be set to?',
    options: [
      '53 degrees — Reefer 53 is the setpoint',
      '36 degrees in continuous mode',
      'Continuous mode only; temperature is not specified',
      '36 degrees pulping temp at the receiver',
    ],
    correct: 1,
  },
  {
    id: 'L6',
    type: 'written',
    script: "We need a pulp reading before the driver leaves — have them probe the actual product, not just photograph the reefer display.",
    audioFile: 'audio/L6.wav',
    question: 'What is the driver being asked to do, and what must they avoid doing?',
  },
  {
    id: 'L7',
    type: 'mcq',
    script: 'Report any over, short, or damaged freight with pictures within two hours of discovering the damage, or the claim falls on you.',
    audioFile: 'audio/L7.wav',
    question: 'If freight is damaged, what is the deadline to report it with pictures?',
    options: [
      'Within 2 hours of completing delivery paperwork',
      'Before the end of the business day',
      'Within 24 hours of delivery',
      'Within 2 hours of discovering the damage',
    ],
    correct: 3,
  },
  {
    id: 'L10',
    type: 'written',
    script: "I'm adding our afterhours team to this email. Make sure you reply all and reattach the rate confirmation, since they were not on the original chain.",
    audioFile: 'audio/L10.wav',
    question: 'What two things should you do when a new contact is added to the email thread?',
  },
];

export const SPEAKING: SpeakingItem[] = [
  { id: 'S1', type: 'text', prompt: 'At pickup there\'s a difference in the delivery location — the address on the BOL doesn\'t match the one on the rate confirmation. Call the broker, verify the correct delivery location, and tell them what information you need to check the load and get it good-to-go (g2g). Record what you would say to the broker.' },
  { id: 'S2', type: 'text', prompt: 'You booked a load where the phone deal was 1 pickup + 1 delivery, but the RC came in as 1 pickup + 2 deliveries. Call the broker, point out the phone deal, and ask them to correct the RC. Record what you would say.' },
  { id: 'S3', type: 'call', audioFile: 'audio/S3.mp3', script: 'Hi, this is Dave with Summit Logistics. Your driver was a no-show this morning and has not answered any of our calls. We\'ve received no calls, no emails, and no updates from your company. This is completely unacceptable and highly unprofessional. If your driver is not at the shipper within 1 hour, we will file a FreightGuard report against your company. Need an answer as soon as possible.', prompt: 'The broker is threatening to file a FreightGuard report. How would you respond? Record your answer.' },
  { id: 'S4', type: 'call', audioFile: 'audio/S4.mp3', script: 'Hi, this is Maria with Coyote. Before I send over any load details, I need to verify you really are dispatching for this MC and not double-brokering or running a scam. Can you confirm if Andrew Watson is part of your team?', prompt: 'How should you answer the call and verify? Record your answer.' },
  { id: 'S5', type: 'call', audioFile: 'audio/S5.mp3', script: 'Hey, it\'s Tom at Scotlynn. I see the tracking is off on my load — what\'s the ETA? When\'s your driver going to deliver?', prompt: 'How should you answer the call? Record your answer.' },
];

export function publicQuestions(tier: string) {
  const bank = QUESTION_BANK[tier];
  const strip = (qs: Question[]) => qs.map(({ id, text, options }) => ({ id, text, options }));
  return { vocab: strip(bank.vocab), premises: strip(bank.premises) };
}

export function publicListening() {
  return LISTENING.map((item) => {
    if (item.type === 'written') {
      return { id: item.id, audioFile: item.audioFile, question: item.question, question2: item.question2, type: 'written' as const };
    }
    return { id: item.id, audioFile: item.audioFile, question: item.question, type: 'mcq' as const, options: item.options };
  });
}

export function publicSpeaking() {
  return SPEAKING.map(({ id, prompt, type, audioFile }) =>
    audioFile
      ? { id, prompt, type: 'call' as const, audioFile }
      : { id, prompt, type: 'text' as const });
}

// ---- Per-question timing (seconds). Every question gets its own slice; unused time is not banked. ----
export const QUESTION_SECONDS = {
  mcq: 40,               // intermediate + advanced MCQ items (kept short so answers can't be looked up)
  advancedWritten: 240,  // each written broker email
  listeningMcq: 90,      // includes up to 2 plays of the clip
  listeningWritten: 120,
  speakingText: 180,     // S1, S2
  speakingCall: 210,     // S3–S5 (includes playing the broker call)
};

// Slack allowed past a block's budget before the server force-marks it timed out.
export const TIMEOUT_GRACE_SECONDS = 60;
// Fallback slack when the client never reported the block's end (crash/closed tab).
export const TIMEOUT_FALLBACK_SECONDS = 300;

// Timed blocks. The "advanced" flow section is split in two so MCQ time can't be hoarded for the emails.
export const TIMED_BLOCKS = ["intermediate", "advanced_mcq", "advanced_written", "listening", "speaking"] as const;
export type TimedBlock = (typeof TIMED_BLOCKS)[number];

// Seconds allotted to each question of a block, in presentation order.
export function blockSlices(block: TimedBlock): number[] {
  const T = QUESTION_SECONDS;
  switch (block) {
    case "intermediate": {
      const b = QUESTION_BANK.intermediate;
      return [...b.vocab, ...b.premises].map(() => T.mcq);
    }
    case "advanced_mcq": {
      const b = QUESTION_BANK.advanced;
      return [...b.vocab, ...b.premises].map(() => T.mcq);
    }
    case "advanced_written":
      return WRITTEN_PROMPTS.advanced.map(() => T.advancedWritten);
    case "listening":
      return LISTENING.map((q) => (q.type === "written" ? T.listeningWritten : T.listeningMcq));
    case "speaking":
      return SPEAKING.map((q) => (q.audioFile ? T.speakingCall : T.speakingText));
  }
}

export function blockBudget(block: TimedBlock): number {
  return blockSlices(block).reduce((a, b) => a + b, 0);
}

export function band(score: number, total: number): string {
  const pct = score / total;
  if (pct >= 0.875) return "Strong";
  if (pct >= 0.625) return "Adequate";
  return "Lacking";
}
