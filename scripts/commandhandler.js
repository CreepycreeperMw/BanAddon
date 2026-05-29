import {Block, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, Dimension, Entity, system, world, CustomCommandSource, Player} from "@minecraft/server"
import { config } from "../../configuration/config"

/** @type {Command[]} */
let commandQueue = []
/** @type {(CommandOption | StaticCommandOption)[]} */
let commandOptionsQueue = []

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
     * @param {{name: string, type: CustomCommandParamType, optional?: boolean}[]} parameters The parameters this command has
     * @throws if the command name contains spaces or name or description are undefined
     */
    constructor(name, description, aliases, requires_cheats, parameters = []) {
        this.name = name
        this.description = description
        this.aliases = aliases
        this.requires_cheats = requires_cheats
        this.parameters = parameters
        this.permissionLevel = CommandPermissionLevel.GameDirectors
    }

    /**
     * Sets the callback that is executed when the command is run by the player
     * @param {(command: Command, sender: CommandSender, label: string, args: any[]) => (import("@minecraft/server").CustomCommandResult) | void} callback Executor function
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

/**
 * Command Options are used in the syntax of slash commands
 */
export class CommandOption {
    /**
     * Registers the command option to the command handler
     */
    register() {
        commandOptionsQueue.push(this)
    }
}

export class StaticCommandOption extends CommandOption {
    /**
     * Creates a static command option. CommandOptions are 
     * used to construct the syntax of a slash command.
     * @param {string} name The name/identifier of this CommandOption under
     *  which it may be refered to.
     * @param {string[]} values A list of possible values for autocompletion.
     */
    constructor(name, values) {
        super()

        this.name = name
        this.values = values
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

/**
 * Base class for a CommandSender Object. This object describes the person
 * that issued the command, which can either be a {@link PlayerSender}, a {@link ConsoleSender},
 * a {@link BlockSender}, a {@link ScriptSender} or a {@link ProxiedCommandSender}
 */
export class CommandSender {
    /**
     * Base class for a CommandSender Object. This object describes the person
     * that issued the command, which can either be a {@link PlayerSender}, a {@link ConsoleSender},
     * a {@link BlockSender}, a {@link ScriptSender} or a {@link ProxiedCommandSender}
     * 
     * @param {string} name 
     * @param {import("@minecraft/server").Vector3} [location]
     * @param {Dimension} dimension
     */
    constructor(name, location, dimension) {
        /**
         * The namer of the command originator
         */
        this.name = name
        /**
         * The location of this command interaction
         */
        this.location = location
        /**
         * The dimension of this command interaction
         */
        this.dimension = dimension

        /**
         * Wether this command sender is a player
         */
        this.isPlayer = false;
    }

    /**
     * Sends a message to the command sender
     * @param {string} message The message to send
     */
    sendMessage(message) {}
    /**
     * Wether the sender has operator permissions
     */
    isOp() {
        return this.getPermissionLevel() >= CommandPermissionLevel.GameDirectors
    }
    /**
     * The permission level of the command sender
     * @returns {CommandPermissionLevel}
     */
    getPermissionLevel() {
        return CommandPermissionLevel.Any
    }
    /**
     * Wether the sender is able to execute the command
     * @param {Command} command  The command of which to compare the permission level to
     */
    hasSufficientPermission(command) {
        return this.getPermissionLevel() >= command.permissionLevel
    }
    /**
     * Runs a command synchronously from the context of
     * this command sender
     * @param {string} command Command to run. Note that command strings
     * should not start with slash.
     * @returns
     * Returns a command result with a count of successful values
     * from the command.
     * @throws
     * Throws an exception if the command fails due to incorrect
     * parameters or command syntax, or in erroneous cases for the
     * command. Note that in many cases, if the command does not
     * operate (e.g., a target selector found no matches), this
     * method will not throw an exception.
     */
    runCommand(command) {
        if(!this.location) return this.dimension.runCommand(command);

        let {x,y,z} = this.location;
        return this.dimension.runCommand(`execute at ${x} ${y} ${z} run ${command}`)
    }

    /**
     * Resolves to get the actual CommandSender object
     */
    resolve() {
        return this
    }
}

/**
 * This CommandSender represents an entity
 */
export class EntitySender extends CommandSender {
    /**
     * Creates a CommandSender representing an entity
     * @param {Entity} entity 
     */
    constructor(entity) {
        super(entity.nameTag, entity.location, entity.dimension)

        this.entity = entity
    }

    runCommand(command) {
        return this.entity.runCommand(command)
    }
}

export class PlayerSender extends EntitySender {
    /**
     * Creates a CommandSender representing a player
     * @param {Player} player 
     */
    constructor(player) {
        super(player)

        this.name = player.name
        this.player = player
        this.entity = player
        this.isPlayer = true
    }

    getPermissionLevel() {
        return this.player.commandPermissionLevel
    }

    sendMessage(message) {
        return this.player.sendMessage(message)
    }
}

/**
 * This CommandSender represents a block
 */
export class BlockSender extends CommandSender {
    /**
     * Creates a CommandSender representing a block
     * @param {Block} block 
     */
    constructor(block) {
        let {x,y,z} = block;
        super(block.localizationKey, {x,y,z}, block.dimension);

        this.block = block
    }

    getPermissionLevel() {
        return CommandPermissionLevel.GameDirectors;
    }
}

export class ConsoleSender extends CommandSender {
    /**
     * Creates a CommandSender that represents the server console or a script api context.
     */
    constructor() {
        super("Server", null, world.getDimension("overworld"))
    }

    /**
     * @returns {true}
     */
    isOp() { return true }

    getPermissionLevel() {
        return CommandPermissionLevel.Owner
    }
}

/**
 * A Proxied Command Sender is iniated e.g. when a command sender
 * uses `/execute as` to execute the command as another person.
 * The methods like {@link CommandSender.sendMessage sendMessage} still refer
 * to the original caller but e.g. {@link CommandSender.location location}
 * points to the callee, the person which the original caller is
 * executing as. A ProxiedCommandSender is also issued when
 * a player triggers a command via a npc dialoge.
 */
export class ProxiedCommandSender extends CommandSender {
    /**
     * A Proxied Command Sender is iniated e.g. when a command sender
     * uses `/execute as` to execute the command as another person.
     * The methods like {@link CommandSender.sendMessage sendMessage} still refer
     * to the original caller but e.g. {@link CommandSender.location location}
     * points to the callee, the person which the original caller is
     * executing as. A ProxiedCommandSender is also issued when
     * a player triggers a command via a npc dialoge.
     * 
     * @param {CommandSender} caller The person that initiated this command interaction
     * @param {CommandSender} callee The person that is being impersonated
     */
    constructor(caller, callee) {
        super(callee.name, callee.location, callee.dimension)
        this.caller = caller;
        this.callee = callee;

        if(callee instanceof EntitySender) this.entity = callee.entity
        if(callee instanceof PlayerSender) {
            this.player = callee.player
            this.isPlayer = true
        }
        if(callee instanceof BlockSender) this.block = callee.block
    }

    /**
     * @param {string} message The message to send
     */
    sendMessage(message) {
        return this.caller.sendMessage(message);
    }

    getPermissionLevel() {
        return this.caller.getPermissionLevel();
    }

    /**
     * @param {string} command Command to run. Note that command strings
     * should not start with slash.
     */
    runCommand(command) {
        return this.callee.runCommand(command)
    }

    /**
     * Resolves the ProxiedCommandSender to get the impersonated callee Sender oject
     * @returns {CommandSender}
     */
    resolve() {
        return this.callee.resolve()
    }
}

// TODO : Make the ProxiedCommandSender extends PlayerSender if callee is a Player

system.beforeEvents.startup.subscribe(e=>{
    // Register Options
    commandOptionsQueue.forEach(opt => {
        e.customCommandRegistry.registerEnum(`${config.namespace}:${opt.name}`, opt.values)
    })

    // Register Commands
    commandQueue.forEach(cmd => {
        let optionalParams = []
        let mandatoryParams = []

        cmd.parameters.forEach(param => {
            let opt = {
                name: (
                    param.type === CustomCommandParamType.Enum
                    ? `${config.namespace}:${param.name}`
                    : param.name
                ),

                type: param.type
            }

            if(param.optional) optionalParams.push(opt)
            else mandatoryParams.push(opt)
        });

        // registering the command for each name and alias
        [cmd.name, ...cmd.aliases].forEach(name => {
            try{
                e.customCommandRegistry.registerCommand({
                    name: `${config.namespace}:${name}`,
                    description: cmd.description,
                    cheatsRequired: cmd.requires_cheats,
                    permissionLevel: cmd.permissionLevel ?? CommandPermissionLevel.GameDirectors,
                    mandatoryParameters: mandatoryParams,
                    optionalParameters: optionalParams
                }, (origin, ...args)=>{
                    /** @type {CommandSender} */
                    let sender;

                    switch (origin.sourceType) {
                        case CustomCommandSource.Block:
                            sender = new BlockSender(origin.sourceBlock)
                            break;

                        case CustomCommandSource.Entity:
                            if(origin.sourceEntity instanceof Player) sender = new PlayerSender(origin.sourceEntity)
                            else sender = new EntitySender(origin.sourceEntity)

                            break;

                        case CustomCommandSource.NPCDialogue:
                            let callerEnt = origin.initiator
                            let calleeEnt = origin.sourceEntity
    
                            let caller, callee = new EntitySender(calleeEnt);
    
                            if(callerEnt instanceof Player) caller = new PlayerSender(callerEnt)
                            else caller = new EntitySender(callerEnt)
    
                            sender = new ProxiedCommandSender(caller, callee)
                            break;

                        case CustomCommandSource.Server:
                            sender = new ConsoleSender()       
                            break;

                        default:
                            throw new Error("Unknown Command Origin")
                    }

                    return cmd.executor(cmd, sender, name, args)
                })
            } catch(err) {
                console.warn("Encountered an error while registering your command:", err)
            }
        })
    })
})