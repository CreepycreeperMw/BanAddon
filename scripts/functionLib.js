import { world, Player, system} from "@minecraft/server";
import { config } from "./config";

globalThis.stackIndex=0;
globalThis.stack=[];
/**
 * Executes an Callback after an set amount of time.
 * @param {()=>void} callback 
 * @param {number} delay The delay after which the callback function is executed defined in milliseconds
 * @returns 
 */
export function setTimeout(callback, delay) {
    let progress = 0;
    let t = new Date().getTime(); // time
    let id = globalThis.stackIndex
    globalThis.stack.push(id)
    system.run(function evs() {
        var ct = new Date().getTime() //current time
        progress+=(ct-t)
        t = ct;
        if(!globalThis.stack.includes(id)) return;
        if(progress<delay) {
            system.run(evs)
        } else {
            callback()
            globalThis.stack.splice(globalThis.stack.indexOf(id),1)
        }
    })
    globalThis.stackIndex+=1
    return id
}
/**
 * Repeatedly executes an callback after a certain time
 * @param {()=>void} callback 
 * @param {number} interval The interval in which the callback is called, in milliseconds.
 * @returns 
 */
export function setInterval(callback, interval) {
    let progress = 0;
    let t = new Date().getTime(); // time
    let id = globalThis.stackIndex
    globalThis.stack.push(id)
    system.run(function evs() {
        var ct = new Date().getTime() //current time
        progress+=(ct-t)
        t = ct;
        if(!globalThis.stack.includes(id)) return;
        if(progress<interval) {
            system.run(evs)
        } else {
            progress=progress-interval;
            callback()
            system.run(evs)
        }
    })
    globalThis.stackIndex+=1
    return id
}
/**
 * Cancels a custom Timeout and removes it from the stack
 * @param  {...number} id 
 */
export function cancelTimeout(...id) {
    globalThis.stack = globalThis.stack.filter(el=>id.includes(el))
}

/**
 * Makes a pause after a set amount of time and then resolves. (Should be used with await)
 * @param {number} delay The Delay in miliseconds
 * @returns 
 */
export function delay(delay) {
    return new Promise(resolve=>{
        setTimeout(resolve,delay)
    })
}

/**
 * @param {string} nameArg which player to get the name from. To search for original name put an @ before the Name
 * @author CreepycreeperMw
 * @returns {Player | undefined} returns either the Player Object or undefined if no player was found.
 */
 export function getPlayer(nameArg) {
    var player;
    if(nameArg.startsWith("@")) {
        player = [...world.getPlayers()].find(player => player.name===nameArg.slice(1))
    } else {
        player = [...world.getPlayers()].find(player => player.nameTag===nameArg)
    }
    if(player instanceof Player) return player
    return undefined;
}

/**
 * Send a message to a player using your configurated prefix
 * @param {Player} player player(s) to broadcast the message to
 * @param {string} text text to display to the player. Use any character " and \ are also supported like normal.
 * @param {string} [prefix] 
 */
export function send(player, text, prefix) {
    return player.sendMessage({"rawtext":[{"text":`${prefix??config.chatPrefix} ${text}`}]})
}

export function noCmd(player, cmd) {
    return player.sendMessage({"rawtext":[{"text":config.chatPrefix + ` §cUnable to find ${cmd?("the command"+cmd):"that command"}. Did you mean kick, ban or crash?`}]})
}

export function serverMsg(selector, text) {
    return world.getDimension("overworld").runCommandAsync(`tellraw ${selector} {"rawtext":[{"text":"${config.chatPrefix} ${text.replace(/\\/gi, "\\\\").replace(/\"/gi, "\\\"")}"}]}`)
}
export function broad(text, selector="@a") {
    return world.getDimension("overworld").runCommandAsync(`tellraw ${selector} {"rawtext":[{"text":"${text.replace(/\\/gi, "\\\\").replace(/\"/gi, "\\\"")}"}]}`)
}

export function supString(text) {
    return text.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"")
}

/**
 * Gets the gamemode of a player
 * @param {Player} player 
 * @returns 
 */
export function getGamemode(player) {
    for (let i = 0; i < 9; i++) {
        try{
            player.runCommand(`testfor @s[m=${i}]`);
            return i;
        } catch {}
    }
}

/**
 * 
 * @param {number} multiplier 
 * @param {RegExpMatchArray} match 
 * @returns 
 */
export function convertTimeToMs(multiplier, match) {
    if(match==null || !match[0]) return 0;
    return parseInt(match[0]) ? (parseInt(match[0]) * multiplier) : 0
}

export function formatTime(seconds) {
    let str = ""
    let time = seconds
    const days = Math.floor(time / 86400);
    time %= 86400;
    const hours = Math.floor(time / 3600);
    time %= 3600;
    const minutes = Math.floor(time / 60);
    time %= 60;

    if(days>0) str += days+" Days, "
    if(hours>0) str += hours+" Hours, "
    if(minutes>0) str += minutes+" Minutes, "
    if(seconds < 3600) str += Math.floor(time)+" Seconds, "
    
    return str.substring(0,str.length-2);
}