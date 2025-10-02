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

            // check if each value exists, and if so, add 
            if (input.title !== undefined) {
                validateRequired(input.title, 'Title');
                updateFields.push('title = ?');
                params.push(input.title);
            }

            if (input.company !== undefined) {
                validateRequired(input.company, 'Company');
                updateFields.push('company = ?');
                params.push(input.company);
            }

            if (input.role !== undefined) {
                validateRequired(input.role, 'Role');
                updateFields.push('role = ?');
                params.push(input.role);
            }

            if (input.start_date !== undefined) {
                if (!validateDateFormat(input.start_date)) {
                    throw new ValidationError('Start Date must be in YYYY-MM-DD format');
                }
                updateFields.push('start_date = ?');
                params.push(input.start_date);
            }

            if (input.end_date !== undefined) {
                if (input.end_date && !validateDateFormat(input.end_date)) {
                    throw new ValidationError('End Date must be in YYYY-MM-DD format');
                }
                updateFields.push('end_date = ?');
                params.push(input.end_date || null);
            }

            if (input.status !== undefined) {
                updateFields.push('status = ?');
                params.push(input.status);
            }

            if (input.description !== undefined) {
                updateFields.push('description = ?');
                params.push(input.description || null);
            }

            if (input.impact_metric !== undefined) {
                updateFields.push('impact_metric = ?');
                params.push(input.impact_metric || null);
            }

            if (input.github_url !== undefined) {
                if (input.github_url && !validateURL(input.github_url)) {
                    throw new ValidationError('GitHub URL is not valid');
                }
                updateFields.push('github_url = ?');
                params.push(input.github_url || null);
            }

            if (input.live_url !== undefined) {
                if (input.live_url && !validateURL(input.live_url)) {
                    throw new ValidationError('Live URL is not valid');
                }
                updateFields.push('live_url = ?');
                params.push(input.live_url || null);
            }

            if (updateFields.length === 0) {
                throw new ValidationError('No fields provided to update');
            }

            // always update the updated_at timestamp
            updateFields.push('updated_at = CURRENT_TIMESTAMP');

            // add ID for the WHERE clause
            params.push(input.id);

            // construct the final SQL statement
            const sql = `
                UPDATE projects
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            // execute the update query
            const result = await DatabaseQuery.run(sql, params);

            // process the result
            if (result.success) {
                if (result.data?.changes && result.data.changes > 0) {
                    return {
                        success: true,
                        error: `No project found with ID ${input.id}`
                    };
                }

                console.log(`Project with ID ${input.id} updated successfully`);
                return {
                    success: true,
                    data: true,
                };
            } else {
                throw new Error('Failed to update project');
            }

        } catch (error) {
            console.error('Error updating project:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    // DELETE: Remove project and all related data (cascades to achievements and project_technologies)
    static async delete(projectId: number): Promise<CrudResponse<boolean>> {
        try {
            // step 1: validate project ID
            validateRequired(projectId, 'Project ID');

            if (typeof projectId !== 'number' || projectId <= 0) {
                throw new ValidationError('Project ID must be a positive number');
            }

            // step 2: check if project exists before attempting delete
            const checkSql = 'SELECT id FROM projects WHERE id = ?';
            const existsResult = await DatabaseQuery.get<{ id: number }>(checkSql, [projectId]);

            if (!existsResult.success || !existsResult.data) {
                return {
                    success: false,
                    error: `No project found with ID ${projectId}`
                };
            }

            // step 3: delete the project (CASCADE will handle achievements and project_technologies)
            const deleteSql = 'DELETE FROM projects WHERE id = ?';
            const deleteResult = await DatabaseQuery.run(deleteSql, [projectId]);

            // step 4: verify deletion
            if (deleteResult.success && deleteResult.data?.changes && deleteResult.data.changes > 0) {
                console.log(`Project with ID ${projectId} deleted successfully (including ${deleteResult.data.changes} related records via CASCADE)`);
                return {
                    success: true,
                    data: true
                };
            } else {
                throw new Error('Failed to delete project');
            }

        } catch (error) {
            console.error('Error deleting project:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}

// ========================================
// ACHIEVEMENT CRUD OPERATIONS
// ========================================

export class AchievementCrudRepository {

    // CREATE: Add new achievement
    static async create(input: CreateAchievementInput): Promise<CrudResponse<number>> {
        try {
            // step 1: validate required fields
            validateRequired(input.project_id, 'Project ID');
            validateRequired(input.title, 'Title');
            validateRequired(input.description, 'Description');
            validateRequired(input.achievement_type, 'Achievement Type');

            // validate that project exists
            const projectCheck = await DatabaseQuery.get(
                'SELECT id FROM projects WHERE id = ?',
                [input.project_id]
            );

            if (!projectCheck.success || !projectCheck.data) {
                throw new ValidationError(`Project with ID ${input.project_id} does not exist`);
            }

            // step 2: construct SQL
            const sql = `
                INSERT INTO achievements (
                    project_id, title, description, technical_details,
                    quantified_impact, achievement_type, is_resume_worthy, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            // step 3: parameter mapping
            const params = [
                input.project_id,
                input.title,
                input.description,
                input.technical_details || null,
                input.quantified_impact || null,
                input.achievement_type,
                input.is_resume_worthy ? 1 : 0
            ];

            // step 4: execute
            const result = await DatabaseQuery.run(sql, params);

            if (result.success && result.data?.id) {
                console.log(`Achievement created with ID: ${result.data.id}`);
                return {
                    success: true,
                    data: result.data.id
                };
            } else {
                throw new Error('Failed to create achievement');
            }

        } catch (error) {
            console.error('Error creating achievement:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    // UPDATE: Update existing achievement
    static async update(input: UpdateAchievementInput): Promise<CrudResponse<boolean>> {
        try {
            validateRequired(input.id, 'Achievement ID');

            const updateFields: string[] = [];
            const params: any[] = [];

            if (input.project_id !== undefined) {
                // Verify project exists
                const projectCheck = await DatabaseQuery.get(
                    'SELECT id FROM projects WHERE id = ?',
                    [input.project_id]
                );
                if (!projectCheck.success || !projectCheck.data) {
                    throw new ValidationError(`Project with ID ${input.project_id} does not exist`);
                }
                updateFields.push('project_id = ?');
                params.push(input.project_id);
            }

            if (input.title !== undefined) {
                validateRequired(input.title, 'Title');
                updateFields.push('title = ?');
                params.push(input.title);
            }

            if (input.description !== undefined) {
                validateRequired(input.description, 'Description');
                updateFields.push('description = ?');
                params.push(input.description);
            }

            if (input.technical_details !== undefined) {
                updateFields.push('technical_details = ?');
                params.push(input.technical_details || null);
            }

            if (input.quantified_impact !== undefined) {
                updateFields.push('quantified_impact = ?');
                params.push(input.quantified_impact || null);
            }

            if (input.achievement_type !== undefined) {
                updateFields.push('achievement_type = ?');
                params.push(input.achievement_type);
            }

            if (input.is_resume_worthy !== undefined) {
                updateFields.push('is_resume_worthy = ?');
                params.push(input.is_resume_worthy ? 1 : 0);
            }

            if (updateFields.length === 0) {
                throw new ValidationError('No fields provided to update');
            }

            params.push(input.id);

            const sql = `
                UPDATE achievements
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            const result = await DatabaseQuery.run(sql, params);

            if (result.success && result.data?.changes && result.data.changes > 0) {
                console.log(`Achievement with ID ${input.id} updated successfully`);
                return {
                    success: true,
                    data: true
                };
            } else if (result.success && result.data?.changes === 0) {
                return {
                    success: false,
                    error: `No achievement found with ID ${input.id}`
                };
            } else {
                throw new Error('Failed to update achievement');
            }

        } catch (error) {
            console.error('Error updating achievement:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    // DELETE: Remove achievement
    static async delete(achievementId: number): Promise<CrudResponse<boolean>> {
        try {
            validateRequired(achievementId, 'Achievement ID');

            if (typeof achievementId !== 'number' || achievementId <= 0) {
                throw new ValidationError('Achievement ID must be a positive number');
            }

            // check if achievement exists
            const checkSql = 'SELECT id FROM achievements WHERE id = ?';
            const existsResult = await DatabaseQuery.get<{ id: number }>(checkSql, [achievementId]);

            if (!existsResult.success || !existsResult.data) {
                return {
                    success: false,
                    error: `No achievement found with ID ${achievementId}`
                };
            }

            // delete the achievement
            const deleteSql = 'DELETE FROM achievements WHERE id = ?';
            const deleteResult = await DatabaseQuery.run(deleteSql, [achievementId]);

            if (deleteResult.success && deleteResult.data?.changes && deleteResult.data.changes > 0) {
                console.log(`Achievement with ID ${achievementId} deleted successfully`);
                return {
                    success: true,
                    data: true
                };
            } else {
                throw new Error('Failed to delete achievement');
            }

        } catch (error) {
            console.error('Error deleting achievement:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}

// ========================================
// TECHNOLOGY CRUD OPERATIONS
// ========================================

export class TechnologyCrudRepository {

    // CREATE: Add new technology
    static async create(input: CreateTechnologyInput): Promise<CrudResponse<number>> {
        try {
            validateRequired(input.name, 'Technology Name');
            validateRequired(input.category, 'Category');
            validateRequired(input.proficiency_level, 'Proficiency Level');

            const sql = `
                INSERT INTO technologies (
                    name, category, proficiency_level, created_at
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `;

            const params = [
                input.name,
                input.category,
                input.proficiency_level
            ];

            const result = await DatabaseQuery.run(sql, params);

            if (result.success && result.data?.id) {
                console.log(`Technology created with ID: ${result.data.id}`);
                return {
                    success: true,
                    data: result.data.id
                };
            } else {
                throw new Error('Failed to create technology');
            }

        } catch (error) {
            console.error('Error creating technology:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    // UPDATE: Update existing technology
    static async update(id: number, input: Partial<CreateTechnologyInput>): Promise<CrudResponse<boolean>> {
        try {
            validateRequired(id, 'Technology ID');

            const updateFields: string[] = [];
            const params: any[] = [];

            if (input.name !== undefined) {
                validateRequired(input.name, 'Technology Name');
                updateFields.push('name = ?');
                params.push(input.name);
            }

            if (input.category !== undefined) {
                updateFields.push('category = ?');
                params.push(input.category);
            }

            if (input.proficiency_level !== undefined) {
                updateFields.push('proficiency_level = ?');
                params.push(input.proficiency_level);
            }

            if (updateFields.length === 0) {
                throw new ValidationError('No fields provided to update');
            }

            params.push(id);

            const sql = `
                UPDATE technologies
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;

            const result = await DatabaseQuery.run(sql, params);

            if (result.success && result.data?.changes && result.data.changes > 0) {
                console.log(`Technology with ID ${id} updated successfully`);
                return {
                    success: true,
                    data: true
                };
            } else if (result.success && result.data?.changes === 0) {
                return {
                    success: false,
                    error: `No technology found with ID ${id}`
                };
            } else {
                throw new Error('Failed to update technology');
            }

        } catch (error) {
            console.error('Error updating technology:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    // DELETE: Remove technology (CASCADE handles project_technologies junction table)
    static async delete(technologyId: number): Promise<CrudResponse<boolean>> {
        try {
            validateRequired(technologyId, 'Technology ID');

            if (typeof technologyId !== 'number' || technologyId <= 0) {
                throw new ValidationError('Technology ID must be a positive number');
            }

            // check if technology exists
            const checkSql = 'SELECT id FROM technologies WHERE id = ?';
            const existsResult = await DatabaseQuery.get<{ id: number }>(checkSql, [technologyId]);

            if (!existsResult.success || !existsResult.data) {
                return {
                    success: false,
                    error: `No technology found with ID ${technologyId}`
                };
            }

            // Optional: Check if technology is linked to projects (for informational purposes)
            const linkedProjectsSql = `
                SELECT COUNT(*) as count
                FROM project_technologies
                WHERE technology_id = ?
            `;
            const linkedResult = await DatabaseQuery.get<{ count: number }>(linkedProjectsSql, [technologyId]);
            const linkedCount = linkedResult.data?.count || 0;

            // delete the technology (CASCADE will remove from project_technologies)
            const deleteSql = 'DELETE FROM technologies WHERE id = ?';
            const deleteResult = await DatabaseQuery.run(deleteSql, [technologyId]);

            if (deleteResult.success && deleteResult.data?.changes && deleteResult.data.changes > 0) {
                console.log(`Technology with ID ${technologyId} deleted successfully (was linked to ${linkedCount} projects)`);
                return {
                    success: true,
                    data: true
                };
            } else {
                throw new Error('Failed to delete technology');
            }

        } catch (error) {
            console.error('Error deleting technology:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
