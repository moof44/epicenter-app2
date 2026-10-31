export type CampaignObjectiveType =
  | 'EXPIRING_SOON'
  | 'RECENTLY_EXPIRED'
  | 'LOW_ATTENDANCE'
  | 'LONG_EXPIRED'
  | 'PT_ACTIVE_NUTRITION'
  | 'PT_EXPIRING_OR_EXPIRED'
  | 'PROMOTION'
  | 'FEEDBACK'
  | 'CONCERNS'
  | 'FOLLOW_UP_ATTEMPT';

export type CallStatus =
  | 'PENDING'
  | 'TEXT_SENT'
  | 'ANSWERED_AGREED'
  | 'ANSWERED_INTERESTED'
  | 'ANSWERED_FEEDBACK_GIVEN'
  | 'CALLBACK_REQUESTED'
  | 'NO_ANSWER'
  | 'CANNOT_BE_REACHED'
  | 'REJECTED'
  | 'DO_NOT_CONTACT';

export type ContactChannel = 'CALL' | 'SMS' | 'BOTH';

export type PriorityLevel = 1 | 2 | 3; // 1 = HIGH, 2 = NORMAL, 3 = LOW

export interface AttemptLog {
  attempt: number;
  channel: ContactChannel;
  status: CallStatus;
  story: string;
  calledByUid: string;
  calledByName: string;
  calledAt: string; // ISO string
}

export interface MemberCallSnapshot {
  id: string;
  name: string;
  firstName: string;
  contactNumber: string;
  gender?: string;
  age?: number;
  fitnessGoal?: string;
  membershipStatus?: string;
  membershipExpiration?: string | null;
  daysUntilOrSinceExpiration?: number | null;
  trainingExpiration?: string | null;
  daysUntilOrSinceTrainingExpiration?: number | null;
  hasActivePt?: boolean;
  lastCheckInDate?: string | null;
  checkInsLast30Days?: number;
  tags?: string[];
  remarks?: string;
  previousCallSummary?: string;
}

export interface CallCampaignItem {
  id: string; // campaignId__memberId
  campaignId: string;
  campaignTitle: string;
  objectiveType: CampaignObjectiveType;
  attemptNumber: number;

  memberId: string;
  memberSnapshot: MemberCallSnapshot;

  priority: PriorityLevel; // 1=HIGH, 2=NORMAL, 3=LOW
  priorityNote?: string;

  isContacted: boolean;
  channelUsed?: ContactChannel;
  callStatus: CallStatus;
  staffStory?: string;
  followUpDate?: string | null;

  calledByUid?: string;
  calledByName?: string;
  calledAt?: string | null;

  attemptHistory: AttemptLog[];
  updatedAt?: string;
  createdAt: string;
}

export interface CampaignStats {
  totalMembers: number;
  completedCount: number;
  pendingCount: number;
  highPriorityCount: number;
  statusBreakdown: Record<CallStatus, number>;
}

export interface CampaignFilterCriteria {
  membershipStatuses?: string[];
  expiringWithinDays?: number | null;
  expiredDaysMin?: number | null;
  expiredDaysMax?: number | null;
  expirationDateFrom?: string | null;
  expirationDateTo?: string | null;

  trainingStatus?: 'ANY' | 'ACTIVE_PT' | 'EXPIRING_PT' | 'EXPIRED_PT' | 'NO_PT';
  trainingExpiringWithinDays?: number | null;

  checkInsLast30DaysMax?: number | null;
  checkInsLast30DaysMin?: number | null;
  daysSinceLastCheckInMin?: number | null;

  goalKeyword?: string;
  gender?: 'ALL' | 'Male' | 'Female' | 'Other';
  excludeDoNotContact?: boolean;
  excludeContactedWithinDays?: number | null;
}

export interface CallCampaign {
  id: string;
  title: string;
  objectiveType: CampaignObjectiveType;
  objectiveDescription: string;
  managerRemarks?: string;
  smsTemplateTaglish: string;
  callScriptTaglish: string;
  attemptNumber: number;
  parentCampaignId?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

  filtersUsed?: CampaignFilterCriteria;
  stats: CampaignStats;

  createdByUid: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CampaignPresetConfig {
  objectiveType: CampaignObjectiveType;
  title: string;
  description: string;
  defaultChannel: ContactChannel;
  smsTemplateTaglish: string;
  callScriptTaglish: string;
  defaultManagerRemarks: string;
  defaultFilters: CampaignFilterCriteria;
}

export const CAMPAIGN_GOAL_PRESETS: Record<CampaignObjectiveType, CampaignPresetConfig> = {
  EXPIRING_SOON: {
    objectiveType: 'EXPIRING_SOON',
    title: 'Expiring Gym Membership (1-7 Days)',
    description: 'Remind members whose gym pass expires in the next 1 to 7 days.',
    defaultChannel: 'SMS',
    smsTemplateTaglish:
      'Hi {firstName}! 👋 Friendly reminder lang po from Epicenter Gym na mag-e-expire na ang gym membership mo on {expirationDate}. Sayang naman ang momentum mo para sa iyong {goal} goal! Daan ka lang sa front desk anytime this week para makapag-renew. See you sa gym! 💪',
    callScriptTaglish:
      'Hello {firstName}, good day! Si {staffName} po ito from Epicenter Gym. Kumusta po ang workouts natin? Tumawag lang po ako for a quick heads-up na mag-e-expire na po ang membership niyo this {expirationDate}. Para tuloy-tuloy po ang progress niyo sa {goal}, gusto niyo po bang i-assist na namin kayo sa renewal pag-visit niyo this week?',
    defaultManagerRemarks:
      'Unahin ang mga members na active mag-check-in this month. Suggest 1-month or 3-month renewal options.',
    defaultFilters: {
      membershipStatuses: ['Active'],
      expiringWithinDays: 7,
      excludeDoNotContact: true
    }
  },

  RECENTLY_EXPIRED: {
    objectiveType: 'RECENTLY_EXPIRED',
    title: 'Recently Expired Membership (1-30 Days)',
    description: 'Encourage members who lapsed in the last 30 days to continue their progress.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! Na-miss ka na namin dito sa Epicenter Gym! 😊 Napansin namin na nag-expire na ang membership mo last {expirationDate}. Wag nating sayangin yung nasimulan mong progress para sa {goal} mo! Balik ka na this week—ready kami tulungan ka ulit. Reply ka lang here if may questions ka! 💪',
    callScriptTaglish:
      'Hi {firstName}, good day! Si {staffName} po from Epicenter Gym. Nangangamusta lang po kami kasi napansin namin na nag-expire na po yung membership niyo last {expirationDate}. Kumusta po kayo? Busy po ba sa work/school lately? Sayang po kasi yung nasimulan ninyong momentum para sa {goal}—kailan po kayo ulit makakadaan para ma-continue natin ang program niyo?',
    defaultManagerRemarks:
      'Makinig sa dahilan kung bakit hindi pa nakakapag-renew (schedule, budget, routine). Offer assistance at flexibility.',
    defaultFilters: {
      membershipStatuses: ['Inactive', 'Expired', 'Active'],
      expiredDaysMin: 1,
      expiredDaysMax: 30,
      excludeDoNotContact: true
    }
  },

  LOW_ATTENDANCE: {
    objectiveType: 'LOW_ATTENDANCE',
    title: 'Active Member Low Attendance Check-In',
    description: 'Motivate active members who have had 2 or fewer visits recently.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! 👋 Kumusta ka na? Checking in lang kami from Epicenter Gym! Napansin namin na medyo matagal ka nang hindi nakakapag-check in since {lastCheckInDate}. Active pa ang membership mo at nandito lang ang team para tulungan ka sa {goal} goal mo. See you sa gym this week! 🔥',
    callScriptTaglish:
      'Hello {firstName}! Si {staffName} po ito from Epicenter Gym. Nangangamusta lang po kami! Active pa po kasi ang membership niyo pero napansin namin na last visit niyo pa po ay noong {lastCheckInDate}. Okay lang po ba kayo, or may kailangan po ba kayong adjustment sa workout routine niyo para sa {goal}? Gusto po naming masulit niyo ang membership niyo—kailan po kayo makakapag-workout ulit?',
    defaultManagerRemarks:
      'Huwag pilitin mag-renew. Alamin kung bakit nawala ang motivation o may injury/busy schedule.',
    defaultFilters: {
      membershipStatuses: ['Active'],
      checkInsLast30DaysMax: 2,
      excludeDoNotContact: true
    }
  },

  LONG_EXPIRED: {
    objectiveType: 'LONG_EXPIRED',
    title: 'Long Expired Win-Back (> 30 Days)',
    description: 'Re-engage former members who have not visited in weeks or months.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! Kumusta? Matagal-tagal ka na naming hindi nakikita dito sa Epicenter Gym! 🏋️‍♂️ Kung ready ka nang mag-restart sa iyong {goal} journey, welcome na welcome ka bumalik anytime. Message mo lang kami kung gusto mong malaman ang latest promos namin for returning members!',
    callScriptTaglish:
      'Hi {firstName}, good day! Si {staffName} po from Epicenter Gym. Kumusta na po kayo? Na-miss na po namin kayo dito sa gym since {expirationDate}! Tumawag lang po ako to check kung nagwo-workout pa rin kayo or kung gusto niyo na pong mag-restart sa fitness goal niyo na {goal}. May bago po kaming offers ngayon—baka gusto niyo pong dumaan this week?',
    defaultManagerRemarks:
      'Friendly welcome-back tone. Highlight new equipment, trainers, and cleaner facilities.',
    defaultFilters: {
      membershipStatuses: ['Inactive', 'Expired'],
      expiredDaysMin: 31,
      excludeDoNotContact: true
    }
  },

  PT_ACTIVE_NUTRITION: {
    objectiveType: 'PT_ACTIVE_NUTRITION',
    title: 'Active Personal Training Nutrition & Goal Check-In',
    description: 'Coach and check in with currently enrolled PT clients on nutrition and hydration.',
    defaultChannel: 'SMS',
    smsTemplateTaglish:
      'Hi {firstName}! 💪 Quick nutrition & progress check-in lang for your Personal Training program here at Epicenter Gym! Kumusta ang kain at protein intake natin this week para sa iyong {goal} goal? Remember, malaking part ng results ay galing sa tamang nutrition + sleep. Reply ka lang here kung kailangan mo ng tips sa meal prep mo!',
    callScriptTaglish:
      'Hello {firstName}! Si {staffName} po ito from Epicenter Gym. Since enrolled ka sa Personal Training natin until {trainingExpirationDate}, gusto lang po kitang kamustahin personally tungkol sa nutrition at diet mo outside the gym. Kumusta po ang meal choices at water intake natin lately? Gusto naming siguraduhin na sabay ang workout at tamang nutrition mo para mabilis nating ma-hit ang {goal} goal mo!',
    defaultManagerRemarks:
      'Targeted for personal nutrition check-ins and recovery advice. Encourage members to coordinate with their coaches.',
    defaultFilters: {
      trainingStatus: 'ACTIVE_PT',
      excludeDoNotContact: true
    }
  },

  PT_EXPIRING_OR_EXPIRED: {
    objectiveType: 'PT_EXPIRING_OR_EXPIRED',
    title: 'Personal Training Renewal Follow-Up',
    description: 'Follow up with members whose personal training is expiring soon or recently expired.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! 👋 Heads-up lang po from Epicenter Gym na ang Personal Training package mo ay valid until {trainingExpirationDate}. Ang ganda na ng progress mo sa {goal}! Let us know kung gusto mo nang i-renew ang PT sessions mo para tuloy-tuloy ang guidance ng coach mo. 💪',
    callScriptTaglish:
      'Hi {firstName}, good day! Si {staffName} po from Epicenter Gym. Tumawag lang po ako regarding your Personal Training program na valid until {trainingExpirationDate}. Kumusta po ang experience niyo with your training so far? Para hindi po maputol yung guided workouts at accountability niyo para sa {goal}, i-schedule na po ba natin ang renewal ng PT sessions niyo?',
    defaultManagerRemarks:
      'Coordinate with the assigned trainer on client milestones before placing the call.',
    defaultFilters: {
      trainingStatus: 'EXPIRING_PT',
      trainingExpiringWithinDays: 7,
      excludeDoNotContact: true
    }
  },

  PROMOTION: {
    objectiveType: 'PROMOTION',
    title: 'Special Promotion / Upsell Campaign',
    description: 'Outreach to a targeted group for ongoing gym promos, packages, or supplements.',
    defaultChannel: 'SMS',
    smsTemplateTaglish:
      'Hi {firstName}! 🎉 Special heads-up from Epicenter Gym! Meron kaming ongoing promo ngayon na bagay na bagay para sa {goal} goal mo. Limited slots lang ito—daan ka sa front desk or reply here para ma-reserve namin ang slot mo!',
    callScriptTaglish:
      'Hello {firstName}! Si {staffName} po from Epicenter Gym. Isa po kayo sa napili naming tawagan today dahil meron po kaming special promo na makakatulong sa {goal} goal niyo. May 1 minute po ba kayo para ma-share ko yung details?',
    defaultManagerRemarks:
      'Clearly specify promo start/end dates and mechanics in your briefing.',
    defaultFilters: {
      excludeDoNotContact: true
    }
  },

  FEEDBACK: {
    objectiveType: 'FEEDBACK',
    title: 'Member Experience & Feedback Survey',
    description: 'Listen to member feedback on facilities, cleanliness, equipment, and staff.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! 💙 Dito sa Epicenter Gym, gusto naming laging mapaganda ang workout experience mo. Kumusta ang gym equipment, cleanliness, at staff service natin lately? Reply ka lang ng iyong feedback or suggestions—super ma-a-appreciate namin!',
    callScriptTaglish:
      'Hello {firstName}, good day! Si {staffName} po from Epicenter Gym. Hindi po ito sales call—tumawag lang po kami para manghingi ng quick feedback tungkol sa experience niyo sa gym. Kumusta po ang facilities at service namin? May ma-su-suggest po ba kayo na pwede naming i-improve?',
    defaultManagerRemarks:
      'Pure relationship and feedback call. Strictly avoid sales pitching; log all comments verbatim.',
    defaultFilters: {
      excludeDoNotContact: true
    }
  },

  CONCERNS: {
    objectiveType: 'CONCERNS',
    title: 'General Member Follow-Up & Concerns',
    description: 'Operational follow-up regarding member requests, scans, or account matters.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! Good day from Epicenter Gym. May quick update/follow-up lang po kami regarding your gym profile. Tawagan ka po namin shortly or reply ka lang here pag free ka. Thank you!',
    callScriptTaglish:
      'Hello {firstName}, good day! Si {staffName} po from Epicenter Gym. Tumawag lang po ako regarding a quick concern/update sa inyong gym membership...',
    defaultManagerRemarks:
      'Read member account remarks before calling.',
    defaultFilters: {
      excludeDoNotContact: true
    }
  },

  FOLLOW_UP_ATTEMPT: {
    objectiveType: 'FOLLOW_UP_ATTEMPT',
    title: 'Follow-Up Attempt (Attempt 2 / 3)',
    description: 'Follow up with members who were unreachable or requested a callback.',
    defaultChannel: 'CALL',
    smsTemplateTaglish:
      'Hi {firstName}! 👋 Nag-try po kaming tumawag kanina from Epicenter Gym pero baka busy ka. Gusto lang sana naming mag-follow up regarding your {goal} journey and membership. Text ka lang here kung anong oras best tumawag. Ingat!',
    callScriptTaglish:
      'Hello {firstName}, good day! Si {staffName} po ulit from Epicenter Gym. Nag-follow up lang po kami sa tawag namin last time—kumusta po kayo? May quick update lang po sana kami para sa inyo...',
    defaultManagerRemarks:
      'Check Attempt 1 call story and time before calling again to avoid reaching them at inconvenient hours.',
    defaultFilters: {
      excludeDoNotContact: true
    }
  }
};
