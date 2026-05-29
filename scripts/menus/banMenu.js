import { CommandPermissionLevel, Player, world } from "@minecraft/server";
import { ActionFormData, CustomForm, Observable } from "@minecraft/server-ui";
import { config } from "../config";
import { ban, banned, kick, knownPlayers, unban } from "../ban_manager";
import { cancelTimeout, send, setTimeout } from "../functionLib";

class PlayerEntry {
    constructor() {
        this.name = Observable.create("Loading...")
        this.isVisible = Observable.create(false)
        this.isDisabled = Observable.create(false)
        this.toolTip = Observable.create("")
        this.id = null
    }
}

/**
 * Returns a list of players based on a search string
 * from the DB or if omitted all online players
 * @param {string} name Search text
 * @returns 
 */
function filterPlayers(name) {
    if(!name || name == "") return world.getAllPlayers();

    /**
     * @type {{name: string, id: string, isHost: string}[]}
     */
    const players = []

    for(let playerEntry of knownPlayers) {
        const [id, playerName] = playerEntry
        if(!playerName.includes(name)) continue;

        let player = {id, name: playerName}

        let pl = world.getEntity(id)
        if(pl && pl instanceof Player) {
            let isHost = pl.commandPermissionLevel >= CommandPermissionLevel.Host
            player.isHost = isHost
        }

        players.push(player)
    }

    return players
}

/**
 * @param {Player} player 
 */
export function banMenu(player) {
    const searchText = Observable.create("", {clientWritable: true})
    const resultsLabel = Observable.create("Online Players: ")

    const previousButtonShowing = Observable.create(false)
    const previousButton = Observable.create(false)
    const nextButton = Observable.create(false)
    const playersPerPage = Observable.create(20, {clientWritable: true})

    let page = 0

    const form = CustomForm.create(player, "Ban Player")
        .spacer()
        .label("Choose the player to ban")
        .spacer()
        .textField("Search players", searchText, { description: "Look through the player database" })
        .divider()
        .spacer()
        .label(resultsLabel)
        .spacer()

    // Create buttons for players
    /** @type {PlayerEntry[]} */
    let playerButtons = []
    for (let i = 0; i < config.maxPlayersPerPage; i++) {
        const entry = new PlayerEntry()

        form.button(entry.name, function banPlayer() {
            // TODO : Add menu to set time as well
            if(entry.id == null) return;

            let targetEntity = world.getEntity(entry.id)
            if(!(targetEntity instanceof Player)) {
                // Didnt find the player in the world right now
                targetEntity = {
                    id: entry.id,
                    name: entry.name,
                    triggerEvent: () => {}
                }
            } else {
                // Check if selected player is host
                if(targetEntity.commandPermissionLevel >= CommandPermissionLevel.Host) {
                    send(player, "§cCan't ban this player!")
                    return form.close();
                }
            }

            // Ban the selected player
            ban(targetEntity)
            form.close()
        }, {
            visible: entry.isVisible,
            tooltip: entry.toolTip,
            disabled: entry.isDisabled
        })

        playerButtons.push(entry)
    }

    /**
     * Updates the buttons which hold the player names
     * (Search results)
     * @param {string} [name] Search text
     */
    function renderForm(name = searchText.getData()) {
        name = name.trim()

        let players = filterPlayers(name)
        const playerAmount = players.length
        const entriesPerPage = playersPerPage.getData()
        const maxPages = Math.ceil(playerAmount / entriesPerPage)

        // Higher page number than there are pages
        if(page >= maxPages) page = maxPages - 1

        // Update every single button
        for (let i = 0; i < config.maxPlayersPerPage; i++) {
            const offset = page * entriesPerPage
            const player = players[i + offset];
            const button = playerButtons[i];

            if(!player || i >= entriesPerPage) {
                button.isVisible.setData(false)
                continue;
            }
            
            button.isVisible.setData(true)

            button.name.setData(player.name)
            button.id = player.id
            button.toolTip.setData(player.isHost ? "You can't ban the owner" : "")
            // button.isDisabled.setData(player.isHost)
        }

        // Results Label
        let label = `Page ${page + 1}/${maxPages}`
        if(name == "") label = "Online players (" + label + ")"
        resultsLabel.setData(label)

        // Next & Previous buttons
        nextButton.setData((page + 1) >= maxPages)
        previousButton.setData(page > 0)
        return maxPages
    }

    let maxPages = 1

    form.spacer()

    // Create next/prev buttons
    form.button("Previous Page", () => {
        if(page > 0) page--

        maxPages = renderForm()
    }, {visible: previousButton})
    form.button("Next Page", () => {
        if((page + 1) < maxPages) page++

        maxPages = renderForm()
    }, {disabled: nextButton})

    form.spacer()
    // Elements per Page
    form.slider("Elements per Page", playersPerPage, 1, config.maxPlayersPerPage, {step: 1})
    
    // After N ms of not typing, rerender the players
    let timeout = null
    // Detect when player types
    searchText.subscribe((text) => {
        if(timeout) cancelTimeout(timeout);
        timeout = setTimeout(() => maxPages = renderForm(text), 500)
    })
    playersPerPage.subscribe(() => {
        if(timeout) cancelTimeout(timeout);
        timeout = setTimeout(() => maxPages = renderForm(), 100)
    })

    form.closeButton()

    maxPages = renderForm()
    return form.show()
}

export function unbanMenu(player) {
    const searchText = Observable.create("", {clientWritable: true})
    const resultsLabel = Observable.create("Banned Players: ")

    const previousButtonShowing = Observable.create(false)
    const previousButton = Observable.create(false)
    const nextButton = Observable.create(false)
    const playersPerPage = Observable.create(20, {clientWritable: true})

    let page = 0

    const form = CustomForm.create(player, "Unban Player")
        .spacer()
        .label("Choose the player to forgive")
        .spacer()
        .textField("Search players", searchText, { description: "Look through the player database" })
        .divider()
        .spacer()
        .label(resultsLabel)
        .spacer()

    // Create buttons for players
    /** @type {PlayerEntry[]} */
    let playerButtons = []
    for (let i = 0; i < config.maxPlayersPerPage; i++) {
        const entry = new PlayerEntry()

        form.button(entry.name, function banPlayer() {
            if(entry.id == null) return;

            // Unban the selected player
            unban(entry.id)
            form.close()
        }, {
            visible: entry.isVisible,
            tooltip: entry.toolTip,
            disabled: entry.isDisabled
        })

        playerButtons.push(entry)
    }

    /**
     * Updates the buttons which hold the player names
     * (Search results)
     * @param {string} [name] Search text
     */
    function renderForm(name = searchText.getData()) {
        name = name.trim()

        let players = Object.keys(banned)
        const playerAmount = players.length
        const entriesPerPage = playersPerPage.getData()
        const maxPages = Math.ceil(playerAmount / entriesPerPage)

        // Higher page number than there are pages
        if(page >= maxPages) page = maxPages - 1

        // Update every single button
        for (let i = 0; i < config.maxPlayersPerPage; i++) {
            const offset = page * entriesPerPage
            const player = players[i + offset];
            const button = playerButtons[i];

            if(!player || i >= entriesPerPage) {
                button.isVisible.setData(false)
                continue;
            }
            
            button.isVisible.setData(true)

            button.name.setData(player.name)
            button.id = player.id
        }

        // Results Label
        let label = `Page ${page + 1}/${maxPages}`
        label = "Banned Players (" + label + ")"
        resultsLabel.setData(label)

        // Next & Previous buttons
        nextButton.setData((page + 1) >= maxPages)
        previousButton.setData(page > 0)
        return maxPages
    }

    let maxPages = 1

    form.spacer()

    // Create next/prev buttons
    form.button("Previous Page", () => {
        if(page > 0) page--

        maxPages = renderForm()
    }, {visible: previousButton})
    form.button("Next Page", () => {
        if((page + 1) < maxPages) page++

        maxPages = renderForm()
    }, {disabled: nextButton})

    form.spacer()
    // Elements per Page
    form.slider("Elements per Page", playersPerPage, 1, config.maxPlayersPerPage, {step: 1})
    
    // After N ms of not typing, rerender the players
    let timeout = null
    // Detect when player types
    searchText.subscribe((text) => {
        if(timeout) cancelTimeout(timeout);
        timeout = setTimeout(() => maxPages = renderForm(text), 500)
    })
    playersPerPage.subscribe(() => {
        if(timeout) cancelTimeout(timeout);
        timeout = setTimeout(() => maxPages = renderForm(), 100)
    })

    form.closeButton()

    maxPages = renderForm()
    return form.show()
}

/**
 * Kick Player Menu
 * @param {Player} player 
 * @returns 
 */
export function kickMenu(player) {
    const searchText = Observable.create("", {clientWritable: true})
    const resultsLabel = Observable.create("Online Players: ")

    const previousButtonShowing = Observable.create(false)
    const previousButton = Observable.create(false)
    const nextButton = Observable.create(false)
    const playersPerPage = Observable.create(20, {clientWritable: true})

    let page = 0

    const form = CustomForm.create(player, "Kick Player")
        .spacer()
        .label("Choose the player to kick")
        .spacer()
        .textField("Search players", searchText, { description: "Filter players..." })
        .divider()
        .spacer()
        .label(resultsLabel)
        .spacer()

    // Create buttons for players
    /** @type {PlayerEntry[]} */
    let playerButtons = []
    for (let i = 0; i < config.maxPlayersPerPage; i++) {
        const entry = new PlayerEntry()

        form.button(entry.name, function banPlayer() {
            // TODO : Add menu to set time as well
            if(entry.id == null) return;
            form.close()

            let targetEntity = world.getEntity(entry.id)
            if(!(targetEntity instanceof Player)) {
                // Didnt find the player in the world right now
                return player.sendMessage("§cCouldn't kick that player right now")
            }

            // Kick the selected player
            kick(targetEntity)
        }, {
            visible: entry.isVisible,
            tooltip: entry.toolTip,
            disabled: entry.isDisabled
        })

        playerButtons.push(entry)
    }

    /**
     * Updates the buttons which hold the player names
     * (Search results)
     * @param {string} [name] Search text
     */
    function renderForm(name = searchText.getData()) {
        name = name.trim()

        let players = world.getPlayers().map(player => ({
            name: player.name,
            id: player.id,
            isHost: player.commandPermissionLevel >= CommandPermissionLevel.Host
        }))
        const playerAmount = players.length
        const entriesPerPage = playersPerPage.getData()
        const maxPages = Math.ceil(playerAmount / entriesPerPage)

        // Higher page number than there are pages
        if(page >= maxPages) page = maxPages - 1

        // Update every single button
        for (let i = 0; i < config.maxPlayersPerPage; i++) {
            const offset = page * entriesPerPage
            const player = players[i + offset];
            const button = playerButtons[i];

            if(!player || i >= entriesPerPage) {
                button.isVisible.setData(false)
                continue;
            }
            
            button.isVisible.setData(true)

            button.name.setData(player.name)
            button.id = player.id
            button.toolTip.setData(player.isHost ? "You can't kick the owner" : "")
            // button.isDisabled.setData(player.isHost)
        }

        // Results Label
        let label = `Page ${page + 1}/${maxPages}`
        if(name == "") label = "Player list (" + label + ")"
        resultsLabel.setData(label)

        // Next & Previous buttons
        nextButton.setData((page + 1) >= maxPages)
        previousButton.setData(page > 0)
        return maxPages
    }

    let maxPages = 1

    form.spacer()

    // Create next/prev buttons
    form.button("Previous Page", () => {
        if(page > 0) page--

        maxPages = renderForm()
    }, {visible: previousButton})
    form.button("Next Page", () => {
        if((page + 1) < maxPages) page++

        maxPages = renderForm()
    }, {disabled: nextButton})

    form.spacer()
    // Elements per Page
    form.slider("Elements per Page", playersPerPage, 1, config.maxPlayersPerPage, {step: 1})
    
    // After N ms of not typing, rerender the players
    let timeout = null
    // Detect when player types
    searchText.subscribe((text) => {
        if(timeout) cancelTimeout(timeout);
        timeout = setTimeout(() => maxPages = renderForm(text), 500)
    })
    playersPerPage.subscribe(() => {
        if(timeout) cancelTimeout(timeout);
        timeout = setTimeout(() => maxPages = renderForm(), 100)
    })

    form.closeButton()

    maxPages = renderForm()
    return form.show()
}