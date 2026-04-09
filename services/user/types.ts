export interface UserData {
  id: string;                // = auth_user_id em app_users
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  permissions: string[];
  password?: string;
  recoveryToken?: string;
  allowRecovery: boolean;
}
