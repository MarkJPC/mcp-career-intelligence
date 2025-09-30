import { CreateProjectInput, CrudResponse, UpdateProjectInput, UpdateAchievementInput, CreateAchievementInput, CreateTechnologyInput } from '../types/crud';
import { validateRequired, validateDateFormat, ValidationError, validateURL } from '../utility/validation';
import { DatabaseQuery } from './queries';

export class ProjectCrudRepository {

    // CREATE: Add new project
    static async create(input: CreateProjectInput): Promise<CrudResponse<number>> {
        try {
            // step 1: validate everything
            validateRequired(input.title, 'Title');
            validateRequired(input.company, 'Company');
            validateRequired(input.role, 'Role');
            validateRequired(input.start_date, 'Start Date');

            // format specific validation for the date
            if (!validateDateFormat(input.start_date)) {
                throw new ValidationError('Start Date must be in YYYY-MM-DD format');
            }

            // optional field validation if provided
            if (input.end_date && !validateDateFormat(input.end_date)) {
                throw new ValidationError('End Date must be in YYYY-MM-DD format');
            }

            if (input.github_url && !validateURL(input.github_url)) {
                throw new ValidationError('GitHub URL is not valid');
            }

            // step 2: sql construction
            // build the INSERT statement dynamically based on provided fields
            const sql = `
                INSERT INTO projects (
                    title, company, role, start_date, end_date, status, description, impact_metric, github_url, live_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;

            // step 3: parameter mapping
            const params = [
                input.title,
                input.company,
                input.role,
                input.start_date,
                input.end_date || null,
                input.status || 'completed',
                input.description || null,
                input.impact_metric || null,
                input.github_url || null,
                input.live_url || null
            ];

            // step 4: database execution
            const result = await DatabaseQuery.run(sql, params);

            // step 5: process the result
            if (result.success && result.data?.id) {
                console.log(`Project created with ID: ${result.data.id}`);
                return {
                    success: true,
                    data: result.data.id, // return the new project's ID
                };
            } else {
                throw new Error('Failed to create project');
            }
        } catch (error) {
            // step 6: error handling
            console.error('Error creating project:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    // UPDATE: Update existing project
    static async update(input: UpdateProjectInput): Promise<CrudResponse<boolean>> {
        try {
            // validate the presence of ID
            validateRequired(input.id, 'Project ID');

            // build dynamic update SQL query based on provided fields
            const updateFields: string[] = [];
            const params: any[] = [];

            // check if each value exists, and if so, add to the update statement
            if (input.title !== undefined) {
                validateRequired(input.title, 'Title');
                updateFields.push('title = ?');
                params.push(input.title);
            }


        }
    }
}
