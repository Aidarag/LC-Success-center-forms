const KEYS = {
  TIMESHEET: 'lsc_portal_timesheet_draft',
  SESSIONS: 'lsc_portal_sessions_draft'
};

/**
 * Save timesheet draft to localStorage.
 */
export const saveTimesheetDraft = (data) => {
  try {
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(KEYS.TIMESHEET, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error saving timesheet draft:', error);
    return false;
  }
};

/**
 * Get timesheet draft from localStorage.
 */
export const getTimesheetDraft = () => {
  try {
    const data = localStorage.getItem(KEYS.TIMESHEET);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving timesheet draft:', error);
    return null;
  }
};

/**
 * Clear timesheet draft.
 */
export const clearTimesheetDraft = () => {
  try {
    localStorage.removeItem(KEYS.TIMESHEET);
    return true;
  } catch (error) {
    console.error('Error clearing timesheet draft:', error);
    return false;
  }
};

/**
 * Save sessions draft to localStorage.
 */
export const saveSessionsDraft = (data) => {
  try {
    const payload = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error saving sessions draft:', error);
    return false;
  }
};

/**
 * Get sessions draft from localStorage.
 */
export const getSessionsDraft = () => {
  try {
    const data = localStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving sessions draft:', error);
    return null;
  }
};

/**
 * Clear sessions draft.
 */
export const clearSessionsDraft = () => {
  try {
    localStorage.removeItem(KEYS.SESSIONS);
    return true;
  } catch (error) {
    console.error('Error clearing sessions draft:', error);
    return false;
  }
};
