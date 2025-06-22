import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, world } from "@minecraft/server";
import { Command, fail, success } from "../commandhandler";
import { banned, knownPlayers } from "..";
import { convertTimeToMs, formatTime, getPlayer, send } from "../functionLib";
import { config } from "../config";

new Command("ban","Banishes a player from the world making them unable to join", ["tempban"], false, [
    {name: "playerName", type: CustomCommandParamType.String},
    {name: "reason", type: CustomCommandParamType.String},
    {name: "timestamp", type: CustomCommandParamType.String}
])
    .setExecutor((command, sender, label, [targetArg, reason, ...timestampParts])=>{
        let target = getPlayer(targetArg)

        if(targetArg === "list") {
            if(!Object.keys(banned)[0]) return send(msg.sender, "§7There are no banned players")

            let list = "§fThe following players are banned:"
            Object.keys(banned).forEach(plId=>{
                list+="\n§7 - §8"+plId+": §7"+knownPlayers.get(plId)
            })
            return success(list)
        } else if(targetArg === "\\list") targetArg = "list"

        if(!target) {
            if(targetArg.startsWith('@')) targetArg = targetArg.replace(/@/,'');
            target = [...knownPlayers.entries()].find(pl=>pl[1]==(targetArg))
            if(target) target = {triggerEvent:()=>{}, id: target[0], name: target[1]}
        }

        if(!target) return {message: "Could not find that player in the database. Please provide a valid player name to ban", status: CustomCommandStatus.Failure}

        let time = null
        if(timestampParts.length > 0) {
            time = 0;
            // years
            time += convertTimeToMs(31536000,timeStampTxt.match(/\d+(?=y)/gi))
            // months
            time += convertTimeToMs(2635200,timeStampTxt.match(/\d+(?=mo)/gi))
            // weeks
            time += convertTimeToMs(604800,timeStampTxt.match(/\d+(?=w)/gi))
            // days
            time += convertTimeToMs(86400,timeStampTxt.match(/\d+(?=d)/gi))
            // hours
            time += convertTimeToMs(3600,timeStampTxt.match(/\d+(?=h)/gi))
            // (min)utes
            time += convertTimeToMs(60,timeStampTxt.match(/\d+(?=mi)/gi))
            // seconds
            time += convertTimeToMs(1,timeStampTxt.match(/\d+(?=s)/gi))
        } else if(label==="tempban") {
            return {
                message: "Please provide a timestamp for how long the player should be banned for. Format: 1y 2mo 3w 4d 5h 6mi 7s.\n\nExample: §f/ban TheTekkit Griefing 5d2h §cbans them for 5 days and 2 hours.",
                status: CustomCommandStatus.Failure
            }
        }

        // Message to be displayed as the command result
        let resultMessage;

        if(time==null) {
            time = -1

            resultMessage = "§"+config.color+target.name+" §7has been §6banned§7."
        } else {
            time = Math.round(new Date().getTime()/1000) + time

            resultMessage = (`§${config.color+target.name} §7has been §6temporarely banned§7 for §c${formatTime(time-Math.floor(new Date().getTime()/1000))}.`)
        }

        // Adding the player to ban list in RAM and in DB
        banned[target.id] = time;
        world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList").replace(new RegExp(target.id+":-?\\d+?;","g"),"")+target.id+":"+time+";")
        // Removing the player from the world without .kick() so he is not banned for the entire server session and can rejoin if he is unbanned
        try{target.triggerEvent("c:crash");} catch {}

        if(world.gameRules.sendCommandFeedback === false && sender.sourceEntity.typeId === "minecraft:player") send(sender.sourceEntity, resultMessage);

        return {
            message: resultMessage+" Reason: "+reason,
            status: CustomCommandStatus.Success
        }
    })
    .setPermissionLevel(CommandPermissionLevel.GameDirectors)
    .register()

new Command("unban", "Pardons a player for their mistakes and removes them from the ban list",["pardon"], false, [
    {name: "playerName", type: CustomCommandParamType.String}
])
    .setExecutor((command, sender, label, [targetArg])=>{
        const unbanPl = [...knownPlayers.entries()].find(pl=>pl[1]==targetArg)
        
        if(!unbanPl) return fail("§cYou need to specify a valid target player to unban")
        if(!banned[unbanPl[0]]) return fail("§7This player is §cnot banned")

        delete banned[unbanPl[0]]
        world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList").replace(new RegExp(unbanPl[0]+":-?\\d+?;","g"),""))

        return success("§aSuccessfully unbanned "+targetArg)
    })
    .setPermissionLevel(CommandPermissionLevel.GameDirectors)
    .register()