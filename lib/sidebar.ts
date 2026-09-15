/**
 * Cookie remembering whether the signed-in customer's sidebar is collapsed.
 * Read on the server so the first paint already has the right width. Lives
 * outside the client component so server code imports the real value.
 */
export const SIDEBAR_COOKIE = "ap_sidebar"
