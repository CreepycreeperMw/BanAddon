export const config = {
    chatPrefix: "§r§8>>",           // The text that the addon prefixes its status reports with
    color: '9',                     // The main color for highlighting important information in chat
    namespace: "banaddon",          // The Namespace of the addon
    illegalUsernameRegex:           // RegExp pattern to check wether a user has an unallowed name
        /[§\"!]/g,  // if the user name includes any of the characters §, ", !
    maxPlayersPerPage: 40           // How many players to display at once, max
}