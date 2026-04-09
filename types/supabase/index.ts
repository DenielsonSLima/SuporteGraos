import type { Json } from './json';
import type { Tables } from './tables';
import type { Views } from './views';
import type { Functions } from './functions';
import type { Enums } from './enums';

export type { Json, Tables, Views, Functions, Enums };
export { Constants } from './enums';

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: Tables
    Views: Views
    Functions: Functions
    Enums: Enums
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type TablesInsert<T extends keyof Tables> = Tables[T]['Insert'];
export type TablesUpdate<T extends keyof Tables> = Tables[T]['Update'];
export type Row<T extends keyof Tables> = Tables[T]['Row'];
