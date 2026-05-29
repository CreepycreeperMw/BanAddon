import { CommandPermissionLevel, CustomCommandParamType, Player, system, world } from "@minecraft/server";
import { Command, fail, success } from "../commandhandler";
import { config } from "../config";

new Command("kick","Removes a player from the world temporarely",["tempkick","tkick","crash"], false, [
    {name: "player", type: CustomCommandParamType.PlayerSelector}
])
    .setExecutor((command, sender, label, [targets])=>{
        let target = targets[0]
        if(!target || !(target instanceof Player)) return fail("§cYou need to specify a valid target player to kick");
        if(target.commandPermissionLevel >= CommandPermissionLevel.Host) return fail("You cannot kick the host of the world.")
        
        world.sendMessage({rawtext:[{translate:"multiplayer.player.left",with:["§e"+target.name]}]})
        return success("§7Successfully "+(label==="crash" ? "crashed":"kicked")+" §"+config.color+target.nameTag)
    })
    .setPermissionLevel(CommandPermissionLevel.GameDirectors)
    .register()