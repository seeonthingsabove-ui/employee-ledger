import { EmployeeRecord, LogEntry, UserProfile } from '../types';

const CACHE_KEY = 'swiftleave_user_roles_cache';
const DIRECTORY_CACHE_KEY = 'swiftleave_employee_directory_cache';
const LOOKUP_CACHE_KEY = 'swiftleave_lookup_cache_v1';

const getEnv = () => ({
    sheetId: process.env.SHEET_ID,
    apiKey: process.env.SHEETS_API_KEY,
    employeeRange: process.env.SHEET_EMPLOYEE_RANGE || 'employeedetails!A:E', // Headers: S_NO, EMP_CODE, EMP_NAME, ROLE, EMAIL_ID
    logRange: process.env.SHEET_LOG_RANGE || 'Logs!A:O', // Logs sheet (A:O) as written by Apps Script
    logWebhook: process.env.SHEET_LOG_WEBHOOK, // Apps Script / API endpoint to append rows securely
    lookupRange: (process.env.SHEET_LOOKUP_RANGE as string | undefined) || 'LookUp!A:B', // Col A: Permission Type, Col B: Leave Type
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
    localStorage.removeItem(LOOKUP_CACHE_KEY);
};

export type LookupOptions = {
    permissionTypes: string[];
    leaveTypes: string[];
};

const normalizeOption = (v: unknown) => (typeof v === 'string' ? v.trim() : '').trim();
const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const parseLookup = (values: string[][]): LookupOptions => {
    if (!values || values.length === 0) return { permissionTypes: [], leaveTypes: [] };

    const normalizeHeaderKey = (v: string) => normalizeOption(v).toLowerCase().replace(/[\s_]+/g, '');
    const firstA = normalizeHeaderKey(values[0]?.[0] || '');
    const firstB = normalizeHeaderKey(values[0]?.[1] || '');
    const hasHeader =
        firstA === 'permissiontype' ||
        firstB === 'leavetype' ||
        (firstA === 'permissiontype' && firstB === 'leavetype');

    const rows = values.slice(hasHeader ? 1 : 0);

    const permissionTypes = uniq(rows.map((r) => normalizeOption(r?.[0])));
    const leaveTypes = uniq(rows.map((r) => normalizeOption(r?.[1])));

    return { permissionTypes, leaveTypes };
};

export const fetchLookupOptions = async (): Promise<LookupOptions> => {
    const { sheetId, apiKey, lookupRange } = getEnv();
    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable lookup dropdowns.');
        const cached = loadCache<LookupOptions>(LOOKUP_CACHE_KEY);
        return (cached['options'] as LookupOptions) || { permissionTypes: [], leaveTypes: [] };
    }

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(lookupRange)}?key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Sheets API error (lookup)', res.status, await res.text());
            const cached = loadCache<LookupOptions>(LOOKUP_CACHE_KEY);
            return (cached['options'] as LookupOptions) || { permissionTypes: [], leaveTypes: [] };
        }
        const data = await res.json();
        const parsed = parseLookup(data.values);
        saveCache(LOOKUP_CACHE_KEY, { options: parsed } as unknown as Record<string, LookupOptions>);
        return parsed;
    } catch (err) {
        console.error('Failed to fetch lookup options from Sheets', err);
        const cached = loadCache<LookupOptions>(LOOKUP_CACHE_KEY);
        return (cached['options'] as LookupOptions) || { permissionTypes: [], leaveTypes: [] };
    }
};

export type LogSheetRecord = {
    timestamp: string;
    requestId: string;
    type: string;
    status: string;
    employeeName: string;
    employeeEmail: string;
    employeeId: string;
    dates: string;
    reason: string;
    managerComment: string;
    managerAction: string;
    permissionType: string;
    leaveType: string;
    requestedInTime: string;
    requestedOutTime: string;
};

const getCellString = (row: unknown[], idx: number) => {
    const v = (row as any[])?.[idx];
    if (v === null || v === undefined) return '';
    return String(v).trim();
};

const parseLogSheetRecords = (values: string[][]): LogSheetRecord[] => {
    if (!values || values.length < 2) return [];

    // Apps Script writes a header row; we’ll treat the first row as header if it looks like one.
    const firstRow = values[0] || [];
    const firstA = (firstRow[0] || '').toString().trim().toLowerCase();
    const hasHeader = firstA === 'timestamp';

    const rows = values.slice(hasHeader ? 1 : 0);

    return rows
        .filter((r) => r && r.length)
        .map((r) => ({
            timestamp: getCellString(r, 0),
            requestId: getCellString(r, 1),
            type: getCellString(r, 2),
            status: getCellString(r, 3),
            employeeName: getCellString(r, 4),
            employeeEmail: getCellString(r, 5).toLowerCase(),
            employeeId: getCellString(r, 6),
            dates: getCellString(r, 7),
            reason: getCellString(r, 8),
            managerComment: getCellString(r, 9),
            managerAction: getCellString(r, 10),
            permissionType: getCellString(r, 11),
            leaveType: getCellString(r, 12),
            requestedInTime: getCellString(r, 13),
            requestedOutTime: getCellString(r, 14),
        }))
        .filter((r) => r.employeeEmail || r.employeeId || r.employeeName);
};

const tryFetchSheetValues_ = async (range: string): Promise<string[][] | null> => {
    const { sheetId, apiKey } = getEnv();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.values as string[][]) || [];
};

export const fetchEmployeeLogHistory = async (employeeEmail: string): Promise<LogSheetRecord[]> => {
    const { sheetId, apiKey, logRange } = getEnv();
    const normalizedEmail = employeeEmail.trim().toLowerCase();
    if (!normalizedEmail) return [];

    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable Leave History.');
        return [];
    }

    try {
        // Try configured range first; then common fallbacks (case + width).
        const rangesToTry = [
            logRange,
            'Logs!A:O',
            'logs!A:O',
            'Logs!A:K',
            'logs!A:K',
        ];

        let values: string[][] | null = null;
        for (const r of rangesToTry) {
            values = await tryFetchSheetValues_(r);
            if (values) break;
        }

        const records = parseLogSheetRecords(values || []);
        const filtered = records.filter((r) => r.employeeEmail === normalizedEmail);

        // Sort newest-first when possible
        filtered.sort((a, b) => {
            const ta = Date.parse(a.timestamp);
            const tb = Date.parse(b.timestamp);
            if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
            return tb - ta;
        });

        return filtered;
    } catch (err) {
        console.error('Failed to fetch employee log history from Sheets', err);
        return [];
    }
};

export const fetchLogRecords = async (): Promise<LogSheetRecord[]> => {
    const { sheetId, apiKey, logRange } = getEnv();

    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable Manager approvals.');
        return [];
    }

    try {
        const rangesToTry = [
            logRange,
            'Logs!A:O',
            'logs!A:O',
            'Logs!A:K',
            'logs!A:K',
        ];

        let values: string[][] | null = null;
        for (const r of rangesToTry) {
            values = await tryFetchSheetValues_(r);
            if (values) break;
        }

        const records = parseLogSheetRecords(values || []);

        // Sort newest-first when possible
        records.sort((a, b) => {
            const ta = Date.parse(a.timestamp);
            const tb = Date.parse(b.timestamp);
            if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
            return tb - ta;
        });

        return records;
    } catch (err) {
        console.error('Failed to fetch log records from Sheets', err);
        return [];
    }
};

export const submitDecisionToLogs = async (params: {
    requestId: string;
    status: 'APPROVED' | 'REJECTED';
    managerComment?: string;
}): Promise<boolean> => {
    const { logWebhook } = getEnv();
    if (!logWebhook) {
        console.warn('No log webhook configured; cannot submit manager decision.');
        return false;
    }

    try {
        // Keep it "simple request" to avoid browser preflight.
        await fetch(logWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                type: 'decision',
                requestId: params.requestId,
                status: params.status,
                managerComment: params.managerComment || '',
                timestamp: Date.now(),
            }),
        });
        return true;
    } catch (err) {
        console.error('Network or CORS error during decision submission. Check deployed script permissions and URL.', err);
        return false;
    }
};

// Task Manager Service Functions
const TASK_LOOKUP_CACHE_KEY = 'task_lookup_cache';
const TASK_LOGS_CACHE_KEY = 'task_logs_cache';

export type TaskLookups = {
    companies: string[];
    platforms: string[];
    fulfillments: string[];
    tasks: string[];
};

const parseTaskLookups = (values: string[][]): TaskLookups => {
    if (!values || values.length < 2) return { companies: [], platforms: [], fulfillments: [], tasks: [] };

    // Assuming first row is header, columns C-F are: Company, Platform, Fulfillment, Task
    const rows = values.slice(1);

    const companies = uniq(rows.map(r => normalizeOption(r?.[2]))); // Column C (index 2)
    const platforms = uniq(rows.map(r => normalizeOption(r?.[3]))); // Column D (index 3)
    const fulfillments = uniq(rows.map(r => normalizeOption(r?.[4]))); // Column E (index 4)
    const tasks = uniq(rows.map(r => normalizeOption(r?.[5]))); // Column F (index 5)

    return { companies, platforms, fulfillments, tasks };
};

export const fetchTaskLookups = async (): Promise<TaskLookups> => {
    const { sheetId, apiKey } = getEnv();
    const taskLookupRange = 'LookUp!A:F'; // Fetch columns A-F to get C-F

    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable task lookups.');
        const cached = loadCache<TaskLookups>(TASK_LOOKUP_CACHE_KEY);
        return (cached['options'] as TaskLookups) || { companies: [], platforms: [], fulfillments: [], tasks: [] };
    }

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(taskLookupRange)}?key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Sheets API error (task lookup)', res.status, await res.text());
            const cached = loadCache<TaskLookups>(TASK_LOOKUP_CACHE_KEY);
            return (cached['options'] as TaskLookups) || { companies: [], platforms: [], fulfillments: [], tasks: [] };
        }
        const data = await res.json();
        const parsed = parseTaskLookups(data.values);
        saveCache(TASK_LOOKUP_CACHE_KEY, { options: parsed } as unknown as Record<string, TaskLookups>);
        return parsed;
    } catch (err) {
        console.error('Failed to fetch task lookups from Sheets', err);
        const cached = loadCache<TaskLookups>(TASK_LOOKUP_CACHE_KEY);
        return (cached['options'] as TaskLookups) || { companies: [], platforms: [], fulfillments: [], tasks: [] };
    }
};

export type TaskLogEntry = {
    employeeEmail: string;
    employeeName: string;
    company: string;
    platform: string;
    fulfillment: string;
    task: string;
    quantity: number;
    timestamp: number;
};

export const submitTask = async (entry: TaskLogEntry): Promise<boolean> => {
    const { logWebhook } = getEnv();
    if (!logWebhook) {
        console.warn('No log webhook configured; skipping task submission.');
        return false;
    }

    try {
        await fetch(logWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                type: 'task',
                ...entry
            }),
        });
        return true;
    } catch (err) {
        console.error('Network error during task submission.', err);
        return false;
    }
};

export type TaskLogRecord = {
    timestamp: string;
    employeeName: string;
    employeeEmail: string;
    company: string;
    platform: string;
    fulfillment: string;
    task: string;
    quantity: string;
};

const parseTaskLogRecords = (values: string[][]): TaskLogRecord[] => {
    if (!values || values.length < 2) return [];

    const firstRow = values[0] || [];
    const firstA = (firstRow[0] || '').toString().trim().toLowerCase();
    const hasHeader = firstA === 'timestamp';

    const rows = values.slice(hasHeader ? 1 : 0);

    return rows
        .filter(r => r && r.length)
        .map(r => ({
            timestamp: getCellString(r, 0),
            employeeName: getCellString(r, 1),
            employeeEmail: getCellString(r, 2).toLowerCase(),
            company: getCellString(r, 3),
            platform: getCellString(r, 4),
            fulfillment: getCellString(r, 5),
            task: getCellString(r, 6),
            quantity: getCellString(r, 7),
        }))
        .filter(r => r.employeeEmail);
};

export const fetchUserTasks = async (employeeEmail: string): Promise<TaskLogRecord[]> => {
    const { sheetId, apiKey } = getEnv();
    const taskLogsRange = 'TaskLogs!A:H';
    const normalizedEmail = employeeEmail.trim().toLowerCase();

    if (!normalizedEmail) return [];
    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable Task History.');
        return [];
    }

    try {
        const values = await tryFetchSheetValues_(taskLogsRange);
        const records = parseTaskLogRecords(values || []);
        const filtered = records.filter(r => r.employeeEmail === normalizedEmail);

        // Sort newest-first
        filtered.sort((a, b) => {
            const ta = Date.parse(a.timestamp);
            const tb = Date.parse(b.timestamp);
            if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
            return tb - ta;
        });

        return filtered;
    } catch (err) {
        console.error('Failed to fetch user tasks from Sheets', err);
        return [];
    }
};

export const fetchAllTaskLogs = async (): Promise<TaskLogRecord[]> => {
    const { sheetId, apiKey } = getEnv();
    const taskLogsRange = 'TaskLogs!A:H';

    if (!sheetId || !apiKey) {
        console.warn('Sheets env missing. Provide SHEET_ID and SHEETS_API_KEY to enable Task Reports.');
        return [];
    }

    try {
        const values = await tryFetchSheetValues_(taskLogsRange);
        const records = parseTaskLogRecords(values || []);

        // Sort newest-first
        records.sort((a, b) => {
            const ta = Date.parse(a.timestamp);
            const tb = Date.parse(b.timestamp);
            if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
            return tb - ta;
        });

        return records;
    } catch (err) {
        console.error('Failed to fetch all task logs from Sheets', err);
        return [];
    }
};
