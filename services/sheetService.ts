import { EmployeeRecord, LogEntry, UserProfile } from '../types';

const CACHE_KEY = 'swiftleave_user_roles_cache';
const DIRECTORY_CACHE_KEY = 'swiftleave_employee_directory_cache';

const getEnv = () => ({
    sheetId: process.env.SHEET_ID,
    apiKey: process.env.SHEETS_API_KEY,
    employeeRange: process.env.SHEET_EMPLOYEE_RANGE || 'employeedetails!A:E', // Headers: S_NO, EMP_CODE, EMP_NAME, ROLE, EMAIL_ID
    logRange: process.env.SHEET_LOG_RANGE || 'logs!A:I', // Timestamp, Type, Status, Name, Email, EmpId, Dates, Reason, ManagerNote
    logWebhook: process.env.SHEET_LOG_WEBHOOK, // Apps Script / API endpoint to append rows securely
});

const loadCache = <T>(key: string): Record<string, T> => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
};

const saveCache = <T>(key: string, cache: Record<string, T>) => {
    localStorage.setItem(key, JSON.stringify(cache));
};

const parseEmployees = (values: string[][]): EmployeeRecord[] => {
    if (!values || values.length < 2) return [];
    const headers = values[0].map((h) => h.trim().toLowerCase());

    const findIdx = (...keys: string[]) => {
        for (const key of keys) {
            const idx = headers.indexOf(key.toLowerCase());
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const emailIdx = findIdx('email', 'email_id', 'emailid');
    const nameIdx = findIdx('name', 'emp_name', 'employee_name');
    const idIdx = findIdx('employeeid', 'emp_code', 'employee_code');
    const roleIdx = findIdx('role');
    if (emailIdx === -1 || roleIdx === -1) return [];

    return values.slice(1)
        .map((row) => ({
            email: row[emailIdx]?.trim().toLowerCase(),
            name: row[nameIdx]?.trim() || '',
            employeeId: row[idIdx]?.trim() || '',
            role: (row[roleIdx]?.trim().toLowerCase() as EmployeeRecord['role']) || 'employee',
        }))
        .filter((emp) => !!emp.email);
};

export const fetchEmployeeDirectory = async (): Promise<EmployeeRecord[]> => {
    const { sheetId, apiKey, employeeRange } = getEnv();
    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable employee lookup.');
        return [];
    }

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(employeeRange)}?key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Sheets API error', res.status, await res.text());
            return [];
        }
        const data = await res.json();
        const directory = parseEmployees(data.values);
        saveCache(DIRECTORY_CACHE_KEY, directory.reduce<Record<string, EmployeeRecord>>((acc, emp) => {
            acc[emp.email] = emp;
            return acc;
        }, {}));
        return directory;
    } catch (err) {
        console.error('Failed to fetch employee directory from Sheets', err);
        const cached = loadCache<EmployeeRecord>(DIRECTORY_CACHE_KEY);
        return Object.values(cached);
    }
};

export const fetchUserRole = async (email: string): Promise<UserProfile | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const cache = loadCache<UserProfile>(CACHE_KEY);
    if (cache[normalizedEmail]) {
        return cache[normalizedEmail];
    }

    const directory = await fetchEmployeeDirectory();
    const match = directory.find((emp) => emp.email === normalizedEmail);
    if (match) {
        const profile: UserProfile = { email: match.email, name: match.name, role: match.role };
        cache[normalizedEmail] = profile;
        saveCache(CACHE_KEY, cache);
        return profile;
    }

    return null;
};

export const appendLogEntry = async (entry: LogEntry): Promise<boolean> => {
    const { logWebhook } = getEnv();
    if (!logWebhook) {
        console.warn('No log webhook configured; skipping remote log.');
        return false;
    }

    try {
        // Fire-and-forget; avoid browser CORS enforcement by using no-cors + simple header
        await fetch(logWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(entry),
        });
        return true; // response is opaque in no-cors mode
    } catch (err) {
        console.error('Network or CORS error during log submission. Check deployed script permissions and URL.', err);
        return false;
    }
};

export const clearRoleCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(DIRECTORY_CACHE_KEY);
};
