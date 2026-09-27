export interface DataLogin {
  email: string;
  password: string;
}

export interface UpdatePasswordPayload {
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

