import { CommandPermissionLevel, CustomCommandParamType, Player, system, world } from "@minecraft/server";
import { Command, fail, success } from "../commandhandler";
import { config } from "../config";
import { host } from "../ban_manager";

new Command("kick","Removes a player from the world temporarely",["tempkick","tkick","crash"], false, [
    {name: "player", type: CustomCommandParamType.PlayerSelector}
])
    .setExecutor((command, sender, label, [target])=>{
        target = target[0]
        if(!target || !(target instanceof Player)) return fail("§cYou need to specify a valid target player to kick");
        if(host.id === target.id) return fail("You cannot kick the host of the world.")
        
        world.sendMessage({rawtext:[{translate:"multiplayer.player.left",with:["§e"+target.name]}]})
        system.run(()=>target.triggerEvent("c:crash"))

        return success("§7Successfully "+(label==="crash" ? "crashed":"kicked")+" §"+config.color+target.nameTag)
    })
    .setPermissionLevel(CommandPermissionLevel.GameDirectors)
    .register()