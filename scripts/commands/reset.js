import { CommandPermissionLevel, world } from "@minecraft/server";
import { Command, success } from "../commandhandler";
import { send } from "../functionLib";
import { banned, knownPlayers } from "../ban_manager";

/**
 * The player that is currently attempting to reset the database
 * (This is only relevant for a brief moment)
 * @type {{playerId: import("@minecraft/server").Player, time: ReturnType<Date["getTime"]>}}
 */
const deletingPlayer = {}

new Command("reset","Resets and permanently deletes any data from the ban addon", ["resetdatabase"],false,[])
    .setExecutor((command, sender, label)=>{
        if(sender.sourceEntity && (!deletingPlayer.playerId
            || (deletingPlayer.playerId !== sender.sourceEntity.id)
            || ((new Date().getTime() - deletingPlayer.time) > 10000))
        ) {
            send(sender.sourceEntity, `§cAre you §lsure §r§cthat you want to do this?

Performing this action will §4permanently delete all data §c(banned players etc., player database) associated with the Ban Addon.

§4Repeat /${label} §cto confirm
§r§7§oThis expires after 10 seconds.`)

            
            deletingPlayer.playerId = sender.sourceEntity.id
            deletingPlayer.time = new Date().getTime()
            
            return success("Reset process has been started");
        }

        send(sender.sourceEntity, `§6Starting deletion...`)

        Object.keys(banned).forEach(pl=>delete banned[pl])
        Object.keys(knownPlayers).forEach(pl=>delete knownPlayers[pl])
        world.setDynamicProperty("playerList","")
        world.setDynamicProperty("bannedList","")

        return success("Deleted all ban-addon player data")
    })
    .setPermissionLevel(CommandPermissionLevel.Host)
    .register()

new Command("test","For testing purposes", [],false,[])
    .setExecutor((command, sender, lable, args)=>{
        return success(`Time (ms): ${new Date().getTime().toString().substring(6, 10)}`)
    })
    .register()