export type Department =
  | 'Housekeeping'
  | 'F&B'
  | 'Concierge'
  | 'Security & Safety'
  | 'Front Office'
  | 'Maintenance'
  | 'None';

export type UserRole = 'guest' | 'staff' | 'manager';

export type RequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: Department;
  roomNumber?: string;
  staffIdNumber?: string;
  occupation?: string;
  status?: string;
  hotelId?: string;       // ✅ Hotel isolation
  hotelName?: string;     // ✅ Display name
  entryCode?: string;     // ✅ The code used to enter
}

export interface ServiceRequest {
  id: string;
  roomNumber: string;
  type: string;
  serviceKey?: string;
  message?: string;
  department: Department;
  status: RequestStatus;
  guestId: string;
  guestName?: string;
  timestamp: string;
  updatedAt?: string;
  accepted_time?: string;
  completed_time?: string;
  totalPrice?: number;
  assignedStaffEmail?: string;
  assignedStaffName?: string;
  delayReason?: string;
  rating?: number;
  feedbackComment?: string;
  feedbackDismissed?: boolean;
  language?: string;
}
