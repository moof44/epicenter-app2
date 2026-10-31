# AI Prompt & Schema Guide: Customer Care & Call Center Engine

> **For**: Gemini, Claude, Cursor, ChatGPT, and AI Assistants  
> **Target System**: `gym-app` (`call_campaigns` & `call_campaign_items` collections)  
> **Last Updated**: November 1, 2026  

This document explains how any AI can **read, analyze, and generate** Call Center Campaigns and Call Items in Firestore.

---

## 1. Firestore Data Architecture

### Collection 1: `call_campaigns`
Each document represents a targeted outreach campaign / list.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique campaign ID (e.g. `camp_2026_11_expiring_w1`) |
| `title` | `string` | Human-readable title |
| `objectiveType` | `string` | `EXPIRING_SOON`, `RECENTLY_EXPIRED`, `LOW_ATTENDANCE`, `LONG_EXPIRED`, `PT_ACTIVE_NUTRITION`, `PT_EXPIRING_OR_EXPIRED`, `PROMOTION`, `FEEDBACK`, `CONCERNS`, `FOLLOW_UP_ATTEMPT` |
| `objectiveDescription` | `string` | Brief explanation of the campaign's goal |
| `managerRemarks` | `string` | Pinned instructions/briefing from Manager to staff |
| `smsTemplateTaglish` | `string` | Taglish SMS text with `{firstName}`, `{goal}`, `{expirationDate}`, `{trainingExpirationDate}` |
| `callScriptTaglish` | `string` | Taglish Call script with `{firstName}`, `{goal}`, `{staffName}`, `{expirationDate}` |
| `attemptNumber` | `number` | `1` for initial campaign, `2` or `3` for follow-ups |
| `parentCampaignId` | `string \| null` | Set to previous campaign's ID if this is a follow-up list |
| `status` | `string` | `'ACTIVE'`, `'COMPLETED'`, or `'ARCHIVED'` |
| `stats` | `map` | Pre-aggregated counts: `totalMembers`, `completedCount`, `pendingCount`, `highPriorityCount`, `statusBreakdown` |
| `createdAt` | `string` (ISO) | e.g. `2026-11-01T05:00:00.000Z` |

---

### Collection 2: `call_campaign_items`
Each document represents one member in a campaign.  
**Doc ID Format**: `{campaignId}__{memberId}`

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | `{campaignId}__{memberId}` |
| `campaignId` | `string` | References parent `call_campaigns` doc |
| `campaignTitle` | `string` | Snapshot of parent title |
| `objectiveType` | `string` | Snapshot of objective type |
| `attemptNumber` | `number` | e.g. `1` |
| `priority` | `number` | `1` = High Priority (VIP / Urgent), `2` = Normal, `3` = Low |
| `priorityNote` | `string` | Reason for priority (e.g. "VIP Spender") |
| `memberId` | `string` | Gym member document ID |
| `memberSnapshot` | `map` | `name`, `firstName`, `contactNumber`, `gender`, `fitnessGoal`, `membershipStatus`, `membershipExpiration`, `daysUntilOrSinceExpiration`, `trainingExpiration`, `daysUntilOrSinceTrainingExpiration`, `hasActivePt`, `lastCheckInDate` |
| `isContacted` | `boolean` | `true` if staff has called or texted |
| `channelUsed` | `string` | `'CALL'`, `'SMS'`, or `'BOTH'` |
| `callStatus` | `string` | `'PENDING'`, `'TEXT_SENT'`, `'ANSWERED_AGREED'`, `'ANSWERED_INTERESTED'`, `'ANSWERED_FEEDBACK_GIVEN'`, `'CALLBACK_REQUESTED'`, `'NO_ANSWER'`, `'CANNOT_BE_REACHED'`, `'REJECTED'`, `'DO_NOT_CONTACT'` |
| `staffStory` | `string` | Narrative handover story written by the staff member |
| `attemptHistory` | `array` | List of attempt logs (`{ attempt, channel, status, story, calledByUid, calledByName, calledAt }`) |

---

## 2. Common AI Prompts & How to Execute Them

### Scenario A: Analyzing a Campaign
**User Prompt**: *"Gemini/Claude, analyze Campaign X and tell me what happened, why members aren't renewing, and who we should follow up with."*
- **Action for AI**:
  1. Query `call_campaign_items` where `campaignId == 'X'`.
  2. Inspect `callStatus` counts and read `staffStory` across all items.
  3. Group the common reasons in `staffStory` (e.g. budget, work schedule, injury).
  4. List members with `NO_ANSWER` or `CALLBACK_REQUESTED` as recommended candidates for Attempt 2.

### Scenario B: Generating an Attempt 2 List
**User Prompt**: *"Generate an Attempt #2 follow-up campaign for all unreached members in Campaign X."*
- **Action for AI**:
  1. Query `call_campaign_items` where `campaignId == 'X'` and `callStatus in ['NO_ANSWER', 'CANNOT_BE_REACHED', 'CALLBACK_REQUESTED']`.
  2. Create a new `call_campaigns` doc with:
     - `title`: `"Attempt #2 - [Original Title]"`
     - `objectiveType`: `"FOLLOW_UP_ATTEMPT"`
     - `attemptNumber`: `2`
     - `parentCampaignId`: `'X'`
  3. Create matching `call_campaign_items` docs carrying over their prior `attemptHistory`.
