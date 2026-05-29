import { CommandPermissionLevel, CustomCommandParamType, Player, system, world } from "@minecraft/server";
import { Command, fail, success } from "../commandhandler";
import { config } from "../config";

new Command("whitelist","Enables a whitelist for this server",[], false, [
    {name: "player", type: CustomCommandParamType.PlayerSelector}
])
    .setExecutor((command, sender, label, [targets])=>{
        
    })
    .setPermissionLevel(CommandPermissionLevel.GameDirectors)
    .register()

