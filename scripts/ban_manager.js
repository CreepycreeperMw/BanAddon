import { Player, system, world } from "@minecraft/server";
import { config } from "./config";

/** 
 * indexed by playerId
 * returns name
 * @type {Map<string, string>}
 */
export const knownPlayers = new Map()

/**
 * A list of all banned players indexed by their ID returning an date until they are banned or -1 if its forever
 * @type {{[playerId: string]:number}}
 */
export const banned = {}

/**
 * Bans a player from the world
 * @param {{id: string, name: string, triggerEvent: Function}} target 
 * @param {number} [time] 
 */
export function ban(target, time = -1) {
    // Adding the player to ban list in RAM and in DB
    banned[target.id] = time;

    // Refresh the DB
    world.setDynamicProperty(
        "bannedList",
        world.getDynamicProperty("bannedList")
            // Remove old entry
            .replace(
                new RegExp(target.id+":-?\\d+?;","g"),
                ""
            )
        // Append new entry
        + target.id + ":" + time + ";")

    // Removing the player from the world without .kick() so he is not banned for
    // the entire server session and can rejoin if he is unbanned
    try{
        system.run(() => target.triggerEvent("c:crash"))
    } catch(err) {
        console.warn("[BAN ADDON] Error whilst trying to remove a player: ", err)
    }
}

/**
 * Unbans a player from the world
 * @param {string} targetId 
 * @returns {boolean} Wether the unban was successful
 */
export function unban(targetId) {
    return delete banned[targetId]
}

export function kick(player) {
    system.run(()=>player.triggerEvent("c:crash"))
}

world.afterEvents.playerJoin.subscribe(evt=>{
    // Refresh disk stored values
    if(!knownPlayers.has(evt.playerId)) {
        world.setDynamicProperty("playerList",world.getDynamicProperty("playerList")+evt.playerId+":"+evt.playerName+";");
    }
    // Refresh memory stored values
    knownPlayers.set(evt.playerId, evt.playerName)

    // Check if the player is banned or has illegal username
    if(banned[evt.playerId] || config.illegalUsernameRegex.test(evt.playerName)) {
        if(banned[evt.playerId] != -1 && new Date().getTime()/1000 > banned[evt.playerId]) {
            // If player is not banned indefinetly and the tempban timer has run out, unban him now.
            delete banned[evt.playerId]
            world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList").replace(new RegExp(evt.playerId+":-?\\d+?;","g"),""))
        }
        else {
            const player = world.getEntity(evt.playerId)
            if(!(player instanceof Player)) return;

            console.log("[BanAddon] Kicked ", player.name)
            player.triggerEvent("c:crash")
        }
    }
})

world.afterEvents.worldLoad.subscribe(()=>{
    world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList") || "")
    world.setDynamicProperty("playerList",world.getDynamicProperty("playerList") || "")
    world.setDynamicProperty("whiteList",world.getDynamicProperty("whiteList") || "")

    world.getDynamicProperty("bannedList").split(";").forEach(entry => {
        if(entry=='') return;
        let [id, due] = entry.split(":");

        banned[id] = parseInt(due)
    })

    world.getDynamicProperty("whiteList").split(";").forEach(entry => {

    })

    // Load all existing players in from the db
    world.getDynamicProperty("playerList")
        .split(";")
        .concat(
            world.getAllPlayers()
                .map(pl=>pl.id+":"+pl.name)
        )
        .forEach(entry => {
            if(entry=='') return;

            let [id, name] = entry.split(":");
            knownPlayers.set(id, name)
        })
})