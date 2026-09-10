export type IncidentCategory = 
  | 'EQUIPMENT'          // Broken cable, damaged dumbbell, treadmill error
  | 'FACILITY'           // Water leak, power outage, AC failure, shower issue
  | 'MEMBER_BEHAVIOR'    // Rules violation, altercation, unauthorized guest
  | 'SAFETY_INJURY'      // Slip & fall, dropped weight, medical incident
  | 'CASH_FINANCIAL'     // Register variance, suspicious transaction
  | 'STAFF_OPERATIONAL'  // Shift abandonment, tardiness, dispute
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export interface IncidentReport {
  id?: string;
  incidentNumber: string;       // e.g. "INC-202609-001"
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  incidentDate: string;         // YYYY-MM-DD
  incidentTime?: string;        // "14:30"
  location?: string;            // "Free Weights", "Cardio Zone", "Front Desk"
  description: string;
  reportedByUid: string;
  reportedByName: string;
  reportedAt: any;              // Timestamp or Date
  involvedPersons?: string[];   // Member or staff names
  resolutionNotes?: string;
  resolvedByUid?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: any | null;      // Timestamp or Date
  createdAt: any;
  updatedAt: any;
}

export type SystemAnomalyType = 
  | 'CASH_DISCREPANCY'   // From 'shifts' where difference !== 0
  | 'STAFF_TARDINESS'    // From 'staff_attendance' where lateMinutes > 0
  | 'OVERDUE_SESSION'    // From 'attendance' where check-in > 3h or unclosed
  | 'VOIDED_TRANSACTION' // From 'transactions' where status === 'VOID'
  | 'PENDING_CLAIM';     // From 'commissions' where claim status === 'PENDING'

export interface SystemAnomaly {
  id: string;
  type: SystemAnomalyType;
  title: string;
  timestamp: Date;
  dateStr: string;
  severity: IncidentSeverity;
  details: string;
  amount?: number;
  personName?: string | null;
  referenceId?: string;
  isResolved: boolean;
  resolutionText?: string;
}

export interface IncidentSummaryStats {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  systemAnomalyCount: number;
  manualIncidentCount: number;
  criticalCount: number;
}
