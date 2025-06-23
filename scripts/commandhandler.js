import {CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system} from "@minecraft/server"
import { config } from "./config"

/** @type {Command[]} */
let commandQueue = []

/**
 * A basic wrapper around the new CustomCommand APIs that mojang introduced
 */
export class Command {
    /**
     * Creates a new Slash Command
     * @param {string} name The name of the command. Is not case insensitive, cannot contain spaces.
     * @param {string} description The description of the command. Used in help command e.g.
     * @param {string[]} aliases Alternative spellings / names for the command.
     * @param {boolean} [requires_cheats] Wether the command requires cheats to be toggled on to execute. Defaults to true
     * @param {{name: string, type: CustomCommandParamType, optional: boolean}[]} parameters The parameters this command has
     * @throws if the command name contains spaces or name or description are undefined
     */
    constructor(name, description, aliases, requires_cheats, parameters = []) {
        this.name = name
        this.description = description
        this.aliases = aliases
        this.requires_cheats = requires_cheats
        this.parameters = parameters
    }

    /**
     * Sets the callback that is executed when the command is run by the player
     * @param {(command: Command, sender: import("@minecraft/server").CustomCommandOrigin, label: string, args: any[]) => (import("@minecraft/server").CustomCommandResult)} callback Executor function
     * @returns 
     */
    setExecutor(callback) {
        this.executor = callback
        return this;
    }

    /**
     * Sets the permission level for this command, which restricts
     * usage if you dont have the permission level required or higher.
     * @param {CommandPermissionLevel} level the level of permission required for this command
     */
    setPermissionLevel(level) {
        this.permissionLevel = level
        return this;
    }

    register() {
        commandQueue.push(this)
    }
}

export function fail(message) {
    return {
        message,
        status: CustomCommandStatus.Failure
    }
}

export function success(message) {
    return {
        message: config.chatPrefix + ' §r§7' + message,
        status: CustomCommandStatus.Success
    }
}

system.beforeEvents.startup.subscribe(e=>{
    commandQueue.forEach(cmd=>{
        let optionalParams = []
        let mandatoryParams = []

        cmd.parameters.forEach(param=>{
            if(param.optional) optionalParams.push({name: param.name, type: param.type})
            else mandatoryParams.push({name: param.name, type: param.type})
        });

        // registering the command for each name and alias
        [cmd.name, ...cmd.aliases].forEach(name=> {
            try{
                e.customCommandRegistry.registerCommand({
                    name: `${config.namespace}:${name}`,
                    description: cmd.description,
                    cheatsRequired: cmd.requires_cheats,
                    permissionLevel: cmd.permissionLevel ?? CommandPermissionLevel.GameDirectors,
                    mandatoryParameters: mandatoryParams,
                    optionalParameters: optionalParams
                }, (origin, ...args)=>{
                    return cmd.executor(cmd, origin, name, args)
                })
            } catch(err) {
                console.warn("Encountered an error while registering your command:", err)
            }
        })
    })
})