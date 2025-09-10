/*
    These checks are used to validate user input and ensure that required fields are present.
*/

// custom error for validation
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
};

// input checking
export const validateRequired = (value: any, fieldName: string): void => {
    // check if value exists and isn't empty string
    if (!value || (typeof value == 'string' && value.trim() == '')) {
        throw new ValidationError(`Missing required field: ${fieldName}`);
    }
};

// validate email against basic regex pattern
export const validateEmail = (email: string): boolean => {
    // regex pattern for basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
};

// validate URL against javascript's built in URL constructor
export const validateURL = (url: string): boolean => {
    try {
        new URL(url);   // try and make a URL with the string
        return true;    // if it doesn't throw, it's a valid URL
    } catch {
        return false;
    }
};

// validate date format
export const validateDateFormat = (date: string): boolean => {
    // first check: does it match YYYY-MM-DD format?
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
        return false;
    }

    // second check: is it a valid date?
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
};
