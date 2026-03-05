/**
 * Tipos locais do submódulo Usuários.
 * Re-exporta o tipo principal e define tipos auxiliares do formulário.
 */
import type { UserData } from '../../../services/userService';
import type { validatePasswordStrength } from '../../../utils/passwordValidator';

/** Re-export para consumo interno do submódulo */
export type { UserData };

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  width: string;
}

export interface UserFormProps {
  editingId: string | null;
  formData: Partial<UserData>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<UserData>>>;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPasswordFields: boolean;
  setShowPasswordFields: (v: boolean) => void;
  passwordMode: 'auto' | 'manual';
  setPasswordMode: (v: 'auto' | 'manual') => void;
  expandedModules: string[];
  onToggleModuleExpansion: (moduleId: string) => void;
  onTogglePermission: (permId: string) => void;
  onToggleAllPermissions: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  strength: PasswordStrength;
  passwordValidation: ReturnType<typeof validatePasswordStrength>;
}
