export type UserRole = 'admin' | 'manager' | 'staff' | 'guest';
export type Department = 'Housekeeping' | 'Security' | 'Security & Safety' | 'Concierge' | 'F&B' | 'Front Office' | 'None';
export type RequestStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Completed';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: Department;
  roomNumber?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
}

export interface ServiceRequest {
  id: string;
  roomNumber: string;
  type: string;
  message?: string;
  items?: { name: string, quantity: number }[];
  totalPrice?: number;
  department: Department;
  status: RequestStatus;
  guestId: string;
  timestamp: any; // This will be request_time
  updatedAt: any;
  accepted_time?: any;
  completed_time?: any;
  // Taxi fields
  destination?: string | null;
  pickupTime?: string | null;
  // Restaurant fields
  restaurantName?: string;
  pax?: number;
  preferredTiming?: string;
  // Concierge fields
  serviceType?: string;
  carModel?: string;
  days?: number;
  // Luxury Overhaul Fields
  housekeepingOption?: string;
  dietaryRequirements?: string;
  specialOccasion?: 'Birthday' | 'Anniversary' | 'None';
  language?: 'English' | 'Arabic' | 'Russian' | 'Mandarin' | 'Turkish' | 'German' | 'French';
  priority?: 'High' | 'Normal';
  assignedStaffEmail?: string;
  rating?: number;
  feedbackComment?: string;
  feedbackAt?: any;
  feedbackDismissed?: boolean;
  isCritical?: boolean;
  guestName?: string;
  delayReason?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
