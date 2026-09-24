export type UserRole = "patient" | "doctor" | "researcher" | "admin";
export type ScanStatus = "pending" | "completed" | "failed";

export type UserProfile = {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  dob?: string | null;
  created_at?: string;
};

export type ScanResult = {
  id: number;
  original_image: string;
  gradcam_image: string | null;
  disease: string | null;
  disease_confidence: number | null;
  viral_score: number | null;
  bacterial_score: number | null;
  normal_score: number | null;
  covid_score?: number | null;
  model?: string | null;
  is_ood?: number | boolean | null;
  ood_score?: number | null;
  ood_reason?: string | null;
  explanation: string | null;
  patient_notes: string | null;
  status: ScanStatus;
  created_at: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};
