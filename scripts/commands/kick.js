import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, Player, world } from "@minecraft/server";
import { Command, fail, success } from "../commands";
import { config } from "../config";

new Command("kick","Removes a player from the world temporarely",["tempkick","tkick","crash"], false, [
    {name: "player", type: CustomCommandParamType.PlayerSelector}
])
    .setExecutor((command, sender, label, [target])=>{
        if(!target || !(target instanceof Player)) return fail("§cYou need to specify a valid target player to kick");

        world.sendMessage({rawtext:[{translate:"multiplayer.player.left",with:["§e"+target.name]}]})
        target.triggerEvent("c:crash");

        return success("§7Successfully "+(label==="crash" ? "crashed":"kicked")+" §"+config.color+target.nameTag)
    })
    .setPermissionLevel(CommandPermissionLevel.GameDirectors)
    .register()