export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  address?: string;
  birth_date?: string;
  gender?: "male" | "female" | "other";
  membership_status?: "active" | "inactive" | "pending" | "expired";
  notes?: string;
  profile_image?: string;
  points?: number;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}
