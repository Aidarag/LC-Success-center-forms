const KEYS = {
  TIMESHEET: 'lsc_portal_timesheet_draft'
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
