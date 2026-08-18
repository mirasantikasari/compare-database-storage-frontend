export interface LoginRequest {
  email: string;
  password: string;
}

export interface PayloadRegister {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface DataAuthType {
  id: string | number;
  name: string;
  email: string;
  role?: string;
}

export interface ResponseLoginType {
  message: string;
  token?: string;
  data?: DataAuthType;
}

export interface ResponseForgotPassword {
  message: string;
}

export interface ResponseResetPassword {
  message: string;
}
