// Hand-authored to mirror supabase/migrations/*.sql exactly, in the same
// shape `supabase gen types typescript` would produce. If you change the
// schema, update this file (or regenerate with the Supabase CLI once a
// project is linked — see README.md).
import type {
  ActivityLevel,
  AiCoachTone,
  CardioPreference,
  Difficulty,
  EquipmentKey,
  ExerciseCategory,
  ExperienceLevel,
  FitnessGoal,
  Location,
  MovementType,
  MuscleGroup,
  NotificationType,
  PendingChangeStatus,
  PendingChangeType,
  PersonalRecordType,
  PlanSource,
  PlanStatus,
  PreferredTime,
  Sex,
  SessionStatus,
  SplitType,
  TrainingStyle,
  Units,
  WorkoutDuration,
} from "./enums";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          date_of_birth: string | null;
          sex: Sex | null;
          height_cm: number | null;
          weight_kg: number | null;
          units: Units;
          experience_level: ExperienceLevel | null;
          activity_level: ActivityLevel | null;
          sleep_hours: number | null;
          avatar_url: string | null;
          timezone: string;
          onboarding_step: number;
          onboarding_completed_at: string | null;
          ai_coach_tone: AiCoachTone;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string;
          date_of_birth?: string | null;
          sex?: Sex | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          units?: Units;
          experience_level?: ExperienceLevel | null;
          activity_level?: ActivityLevel | null;
          sleep_hours?: number | null;
          avatar_url?: string | null;
          timezone?: string;
          onboarding_step?: number;
          onboarding_completed_at?: string | null;
          ai_coach_tone?: AiCoachTone;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      fitness_goals: {
        Row: {
          id: string;
          profile_id: string;
          goal: FitnessGoal;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          goal: FitnessGoal;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fitness_goals"]["Insert"]>;
        Relationships: [];
      };
      training_preferences: {
        Row: {
          profile_id: string;
          days_per_week: number | null;
          preferred_days: number[];
          workout_duration: WorkoutDuration | null;
          preferred_time: PreferredTime | null;
          split_type: SplitType | null;
          location: Location | null;
          equipment: EquipmentKey[] | string[];
          preferred_exercises: string[];
          disliked_exercises: string[];
          training_style: TrainingStyle | null;
          cardio_preference: CardioPreference | null;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          days_per_week?: number | null;
          preferred_days?: number[];
          workout_duration?: WorkoutDuration | null;
          preferred_time?: PreferredTime | null;
          split_type?: SplitType | null;
          location?: Location | null;
          equipment?: string[];
          preferred_exercises?: string[];
          disliked_exercises?: string[];
          training_style?: TrainingStyle | null;
          cardio_preference?: CardioPreference | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_preferences"]["Insert"]>;
        Relationships: [];
      };
      physical_limitations: {
        Row: {
          profile_id: string;
          injuries: string | null;
          limitations: string | null;
          avoid_exercises: string[];
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          injuries?: string | null;
          limitations?: string | null;
          avoid_exercises?: string[];
          notes?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["physical_limitations"]["Insert"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          category: ExerciseCategory;
          primary_muscle: MuscleGroup;
          secondary_muscles: MuscleGroup[];
          equipment: EquipmentKey[];
          difficulty: Difficulty;
          movement_type: MovementType;
          instructions: string[];
          common_mistakes: string[];
          video_url: string | null;
          image_url: string | null;
          is_unilateral: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          category: ExerciseCategory;
          primary_muscle: MuscleGroup;
          secondary_muscles?: MuscleGroup[];
          equipment?: EquipmentKey[];
          difficulty: Difficulty;
          movement_type: MovementType;
          instructions?: string[];
          common_mistakes?: string[];
          video_url?: string | null;
          image_url?: string | null;
          is_unilateral?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      exercise_alternatives: {
        Row: {
          exercise_id: string;
          alternative_exercise_id: string;
          reason: string;
          priority: number;
        };
        Insert: {
          exercise_id: string;
          alternative_exercise_id: string;
          reason?: string;
          priority?: number;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_alternatives"]["Insert"]>;
        Relationships: [];
      };
      workout_plans: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          status: PlanStatus;
          split_type: SplitType;
          days_per_week: number;
          primary_goal: string | null;
          source: PlanSource;
          version: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          status?: PlanStatus;
          split_type: SplitType;
          days_per_week: number;
          primary_goal?: string | null;
          source?: PlanSource;
          version?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_plans"]["Insert"]>;
        Relationships: [];
      };
      workout_days: {
        Row: {
          id: string;
          plan_id: string;
          profile_id: string;
          day_of_week: number;
          name: string;
          is_rest_day: boolean;
          focus_muscle_groups: MuscleGroup[];
          estimated_duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          profile_id?: string;
          day_of_week: number;
          name: string;
          is_rest_day?: boolean;
          focus_muscle_groups?: MuscleGroup[];
          estimated_duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_days"]["Insert"]>;
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_day_id: string;
          profile_id: string;
          exercise_id: string;
          order_index: number;
          is_warmup: boolean;
          sets: number;
          reps_min: number | null;
          reps_max: number | null;
          duration_seconds: number | null;
          rest_seconds: number;
          tempo: string | null;
          intensity_guidance: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workout_day_id: string;
          profile_id?: string;
          exercise_id: string;
          order_index: number;
          is_warmup?: boolean;
          sets: number;
          reps_min?: number | null;
          reps_max?: number | null;
          duration_seconds?: number | null;
          rest_seconds?: number;
          tempo?: string | null;
          intensity_guidance?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_exercises"]["Insert"]>;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          profile_id: string;
          plan_id: string | null;
          workout_day_id: string | null;
          name: string;
          status: SessionStatus;
          started_at: string;
          completed_at: string | null;
          duration_seconds: number | null;
          total_volume_kg: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          plan_id?: string | null;
          workout_day_id?: string | null;
          name: string;
          status?: SessionStatus;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          total_volume_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
        Relationships: [];
      };
      set_logs: {
        Row: {
          id: string;
          session_id: string;
          profile_id: string;
          workout_exercise_id: string | null;
          exercise_id: string;
          set_number: number;
          reps: number | null;
          weight_kg: number | null;
          duration_seconds: number | null;
          rpe: number | null;
          is_completed: boolean;
          notes: string | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          profile_id?: string;
          workout_exercise_id?: string | null;
          exercise_id: string;
          set_number: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          rpe?: number | null;
          is_completed?: boolean;
          notes?: string | null;
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["set_logs"]["Insert"]>;
        Relationships: [];
      };
      body_measurements: {
        Row: {
          id: string;
          profile_id: string;
          weight_kg: number;
          body_fat_pct: number | null;
          measured_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          weight_kg: number;
          body_fat_pct?: number | null;
          measured_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["body_measurements"]["Insert"]>;
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          profile_id: string;
          exercise_id: string | null;
          record_type: PersonalRecordType;
          value: number;
          unit: string;
          reps_at_weight: number | null;
          session_id: string | null;
          achieved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          exercise_id?: string | null;
          record_type: PersonalRecordType;
          value: number;
          unit: string;
          reps_at_weight?: number | null;
          session_id?: string | null;
          achieved_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["personal_records"]["Insert"]>;
        Relationships: [];
      };
      coach_conversations: {
        Row: {
          id: string;
          profile_id: string;
          title: string;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          title?: string;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coach_conversations"]["Insert"]>;
        Relationships: [];
      };
      coach_messages: {
        Row: {
          id: string;
          conversation_id: string;
          profile_id: string;
          role: "user" | "assistant" | "system" | "tool";
          content: string;
          tool_calls: Json | null;
          tool_call_id: string | null;
          tool_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          profile_id?: string;
          role: "user" | "assistant" | "system" | "tool";
          content?: string;
          tool_calls?: Json | null;
          tool_call_id?: string | null;
          tool_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coach_messages"]["Insert"]>;
        Relationships: [];
      };
      pending_plan_changes: {
        Row: {
          id: string;
          profile_id: string;
          conversation_id: string | null;
          change_type: PendingChangeType;
          summary: string;
          payload: Json;
          status: PendingChangeStatus;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          conversation_id?: string | null;
          change_type: PendingChangeType;
          summary: string;
          payload: Json;
          status?: PendingChangeStatus;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["pending_plan_changes"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: NotificationType;
          title: string;
          body: string;
          action_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: NotificationType;
          title: string;
          body?: string;
          action_url?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          profile_id: string;
          workout_reminders: boolean;
          rest_day_reminders: boolean;
          weekly_review: boolean;
          streak_reminders: boolean;
          goal_reminders: boolean;
          channels: Json;
          quiet_hours_start: number | null;
          quiet_hours_end: number | null;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          workout_reminders?: boolean;
          rest_day_reminders?: boolean;
          weekly_review?: boolean;
          streak_reminders?: boolean;
          goal_reminders?: boolean;
          channels?: Json;
          quiet_hours_start?: number | null;
          quiet_hours_end?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Insert"]>;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          profile_id: string | null;
          event_name: string;
          properties: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          event_name: string;
          properties?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      swap_workout_days: {
        Args: { day_id_a: string; day_id_b: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
