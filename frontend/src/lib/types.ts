export interface AuthResponse {
  token: string;
  userId: string;
}

export interface ApiError {
  error: string;
}

export interface User {
  userId: string;
  email: string;
}
