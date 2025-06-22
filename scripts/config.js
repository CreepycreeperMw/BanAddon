export const config = {
    prefix: "!",                    // Prefix to use chat commands - DEPRECATED
    chatPrefix: "§r§8>>",           // The text that the addon prefixes its status reports with
    color: '9',                     // The main color for highlighting important information in chat
    
    acknowledgeWrongCommand: false, // Wether to acknowledge that you tried to use a command that does not exist.
                                    //  make this true if you use no other addons that modify chat behaviour
                                    //  but if you do have chat modifying addons then make this false.
    namespace: "banaddon"           // The Namespace of the addon
}