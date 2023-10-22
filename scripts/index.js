import { DynamicPropertiesDefinition, system, world } from "@minecraft/server";
import { config } from "./config";
import { getPlayer, send, convertTimeToMs, formatTime, noCmd } from "./functionLib";

let timeStarted = new Date().getTime()
let host;
/** 
 * indexed by playerId
 * returns name
 * @type {Map<string, string}
 */
const knownPlayers = new Map()

if(world.getAllPlayers().length > 0)  {
    if(world.getAllPlayers().length > 1) host = -1
    else host = world.getAllPlayers()[0].id
}

/**
 * A list of all banned players indexed by their ID returning an date until they are banned or -1 if its forever
 * @type {{[playerId: string]:number}}
 */
const banned = {}
const deletingPlayer = {}

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

world.afterEvents.worldInitialize.subscribe(evt=>{
    evt.propertyRegistry.registerWorldDynamicProperties(new DynamicPropertiesDefinition().defineString("bannedList",32767,"").defineString("playerList",32767,""))
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

world.beforeEvents.chatSend.subscribe(msg=>{
    if(msg.sender.isOp()==false) return;

    if(msg.message.startsWith(config.prefix)) {
        msg.sendToTargets=true;
        msg.setTargets([]);
        /** @type {string[]} */
        let args = [];

        (msg.message.slice(config.prefix.length)+" ").replace(/\\\"/g, "»").replace(/ @"/g,' "@').split(/" | "/).forEach(function (curr, num) {
            if (num % 2 == 0) {
                curr = curr.trim()
                if (curr == "") return;
                curr.split(" ").forEach((arg) => {
                    args.push(arg.replace(/»/gi, '\\"'));
                });
            } else {
                args.push(curr.replace(/»/gi, '\\"'));
            }
        });

        // this for upwards compatibility (future Minecraft versions)
        let bol = msg.cancel;
        msg.cancel = true;

        // This is required by all commands so its placed above their individual functionality
        let target = (args[1] ? (getPlayer(args[1]?.startsWith('@"') ? args[1]?.replace(/"/g,'') : args[1])) : null)

        if(host && target?.id == host) return send(msg.sender, "§cYou cannot perform this action on the world host.")

        switch (args[0].toLowerCase()) {
            case "crash":
                if(!target) return send(msg.sender, "§cYou need to specify a valid target player to crash");
                system.run(()=>{
                    send(msg.sender, "§7Successfully crashed §"+config.color+target.nameTag);
                    target.triggerEvent("c:crash");
                })
                break;
            case "tempban":
            case "ban":
                if(!target && args[1]) {
                    target = [...knownPlayers.entries()].find(pl=>pl[1]==(args[1].startsWith('@') ? args[1].replace(/@/,'') : args[1]))
                    if(target) target = {triggerEvent:()=>{}, id: target[0], name: target[1]}
                }
                if(!target && args[1] != "list") return send(msg.sender, "§cYou need to specify a valid target player to ban");
                if(args[1]=="list") {
                    if(!Object.keys(banned)[0]) return send(msg.sender, "§7There are no banned players")

                    let list = "§fThe following players are banned:"
                    Object.keys(banned).forEach(plId=>{
                        list+="\n§7 - §8"+plId+": §7"+knownPlayers.get(plId)
                    })
                    return send(msg.sender, list)
                }

                system.run(()=>{
                    let time = null
                    if(args.length>2) {
                        let timeStampTxt = args.slice(2,-1).join('')
                        time = 0;
                        // years
                        time += convertTimeToMs(31536000,timeStampTxt.match(/\d+(?=y)/gi))
                        // months
                        time += convertTimeToMs(26352000,timeStampTxt.match(/\d+(?=mo)/gi))
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
                    } else if(args[0].toLowerCase() == "tempban") return send(msg.sender, "§cYou need to specify the time how long to ban the person")
    
                    if(banned[target.id] && (banned[target.id]-(new Date().getTime()/1000)) > 0) time += banned[target.id]-(new Date().getTime()/1000)
                    if(time==null) {
                        time = -1
                        send(msg.sender, "§"+config.color+target.name+" §7has been §6banned§7.")
                    } else {
                        time = Math.round(new Date().getTime()/1000) + time
                        send(msg.sender, `§${config.color+target.name} §7has been §6temporarely banned§7 for §c${formatTime(time-Math.floor(new Date().getTime()/1000))}.`)
                    }
    
                    banned[target.id] = time;
                    world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList").replace(new RegExp(target.id+":-?\\d+?;","g"),"")+target.id+":"+time+";")
                    target.triggerEvent("c:crash");
                })
                break;
            case "unban":
            case "pardon":
                const unbanPl = [...knownPlayers.entries()].find(pl=>pl[1]==args[1])
                
                if(!unbanPl) return send(msg.sender, "§cYou need to specify a valid target player to unban");
                if(!banned[unbanPl[0]]) return send(msg.sender, "§7This player is §cnot banned");

                system.run(()=>{
                    delete banned[unbanPl[0]]
                    world.setDynamicProperty("bannedList",world.getDynamicProperty("bannedList").replace(new RegExp(unbanPl[0]+":-?\\d+?;","g"),""))
                    send(msg.sender, "§aSuccessfully unbanned "+args[1])
                })
                break;
            case "kick":
                if(!target) return send(msg.sender, "§cYou need to specify a valid target player to kick");
                
                send(msg.sender, "§7Successfully kicked §"+config.color+target.nameTag);
                world.sendMessage({rawtext:[{translate:"multiplayer.player.left",with:["§e"+target.name]}]})
                system.run(()=>{
                    target.triggerEvent("c:crash");
                })
                break;
            case "reset":
                if(deletingPlayer.player = msg.sender.id && deletingPlayer.time) {
                    system.run(()=>{
                        world.setDynamicProperty("playerList","")
                        world.setDynamicProperty("bannedList","")
                    })
                } else {
                    deletingPlayer.player = msg.sender.id
                    deletingPlayer.time = new Date().getTime()
                    send(msg.sender, "§7Are you sure you want to reset the entire player data? Type §c"+config.prefix+"reset §7again to confirm.")
                }
                break;
            default:
                if(config.acknowledgeWrongCommand) noCmd(msg.sender, args[0])
                else msg.cancel = bol;
                break;
        }
    }
})