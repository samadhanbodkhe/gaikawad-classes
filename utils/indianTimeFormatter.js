// Format date to Indian time with AM/PM
const formatIndianDateTime = (date) => {
    if (!date) return 'N/A';
    
    const indianDate = new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    return indianDate;
};

// Format only time in Indian time with AM/PM
const formatIndianTime = (date) => {
    if (!date) return 'N/A';
    
    const indianTime = new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    return indianTime;
};

// Format only date in Indian format
const formatIndianDate = (date) => {
    if (!date) return 'N/A';
    
    const indianDate = new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    return indianDate;
};

module.exports = {
    formatIndianDateTime,
    formatIndianTime,
    formatIndianDate
};