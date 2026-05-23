// Global ref to track which chatId is currently open
// Used to suppress notifications when user is in that specific chat
let _activeChatId = null;

export const setActiveChatId = (id) => { _activeChatId = id; };
export const getActiveChatId = () => _activeChatId;
export const clearActiveChatId = () => { _activeChatId = null; };
