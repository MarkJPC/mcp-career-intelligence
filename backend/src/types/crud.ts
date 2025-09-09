// these are the types that the API will pass into the data query layer
// type for the object being input to create a new project
export interface CreateProjectInput {
    // required fields
  title: string;
  company: string;
  role: string;
  start_date: string;

  // optional fields
  end_date?: string;
  status?: 'ongoing' | 'completed' | 'planned';
  description?: string;
  impact_metric?: string;
  github_url?: string;
  live_url?: string;
}

// type for updating an object | only difference is the need for an ID to specify which object to update
export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: number;
}

// type for the object being input to create a new achievement
export interface CreateAchievementInput {
    project_id: number;
    title: string;
    description: string;
    technical_details?: string;
    quantified_impact?: string;
    achievement_type: 'technical' | 'business' | 'leadership' | 'process';
    is_resume_worthy: boolean;
}

// type for updating an achievement
export interface UpdateAchievementInput extends CreateAchievementInput {
    id: number;
}

// type for creating a new technology
export interface CreateTechnologyInput {
    name: string;
    category: 'language' | 'framework' | 'database' | 'tool' | 'platform';
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

// response type for crud operations
export interface CrudResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
