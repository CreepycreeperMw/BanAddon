import { world } from "@minecraft/server";

let timeStarted = new Date().getTime()
/** @type {import("@minecraft/server").Player} */
export let host;
/** 
 * indexed by playerId
 * returns name
 * @type {Map<string, string>}
 */
export const knownPlayers = new Map()

if(world.getAllPlayers().length > 0)  {
    if(world.getAllPlayers().length > 1) host = -1
    else host = world.getAllPlayers()[0].id
}

/**
 * A list of all banned players indexed by their ID returning an date until they are banned or -1 if its forever
 * @type {{[playerId: string]:number}}
 */
export const banned = {}

world.afterEvents.playerJoin.subscribe(evt=>{
    if(!knownPlayers.has(evt.playerId)) {
        knownPlayers.set(evt.playerId,evt.playerName)
        world.setDynamicProperty("playerList",world.getDynamicProperty("playerList")+evt.playerId+":"+evt.playerName+";");
    }
    if(!host && (new Date().getTime()-timeStarted) < 5000) host = evt.playerId;
    else if(banned[evt.playerId]) {
        if(banned[evt.playerId] != -1 && new Date().getTime()/1000 > banned[evt.playerId]) {
            delete banned[evt.playerId]
            world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList").replace(new RegExp(evt.playerId+":-?\\d+?;","g"),""))
        }
        else world.getEntity(evt.playerId).triggerEvent("c:crash")
    }
})

world.afterEvents.worldLoad.subscribe(()=>{
    world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList") || "")
    world.setDynamicProperty("playerList",world.getDynamicProperty("playerList") || "")
    world.getDynamicProperty("bannedList").split(";").forEach(entry=>{
        if(entry=='') return;
        let [id, due] = entry.split(":");

        banned[id] = parseInt(due)
    })
    world.getAllPlayers().map(pl=>pl.id+":"+pl.name).concat(world.getDynamicProperty("playerList").split(";")).forEach(entry=>{
        if(entry=='') return;
        let [id, name] = entry.split(":");
        knownPlayers.set(id, name)
    })
})