import { CreateProjectInput, CrudResponse } from '../types/crud';
import { validateRequired, validateDateFormat, ValidationError, validateURL } from '../utility/validation';
import { DatabaseQuery } from './queries';

export class ProjectCrudRepository {

    static async create(input: CreateProjectInput): Promise<CrudResponse<number>> {
        try {
            // step 1: validate everything
            validateRequired(input.title, 'Title');
            validateRequired(input.company, 'Company');
            validateRequired(input.role, 'Role');
            validateRequired(input.start_date, 'Start Date');

            // format specific validation
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
                INSERT    
            `
        }
    }
}
