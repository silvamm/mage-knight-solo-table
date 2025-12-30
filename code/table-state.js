const StorageTableStateKey = "table-state"
const StorageDummyPlayerKey = Strings.StorageKey



function TableState() {

    this.dayScore = null
    this.nightScore = null
    this.dayMovePoints = null
    this.nightMovePoints = null
    this.logs = null
    this.reminders = null
    this.currentReputation = null
    this.currentFame = null
    this.currentPeriodScore = null
    this.currentTacticCard = null
    this.tacticDayCards = null
    this.tacticNightCards = null
    this.state = null
    this.resetButton = null

    let that = this;

    this.defaultTableState = {
        night: {
            active: false,
            count: 0
        },
        day: {
            active: true,
            count: 0
        },
        reputation: {
            text: "0",
            value: 0
        },
        tacticCards: {
            current: "",
            disabled : []
        },
        fame: 0,
        logs: "",
        reminders: "",
        level: 1
    }

    this.supports_html5_storage = function() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null
        } catch (e) {
            return false
        }
    }

    this.save = function () {
        if (this.supports_html5_storage())
            localStorage.setItem(StorageTableStateKey, JSON.stringify(this.state))
    }

    this.getSavedTableState = function () {
        if (this.supports_html5_storage()){
            return JSON.parse(localStorage.getItem(StorageTableStateKey))
        }else{
            return null;
        }
    }

    this.initialize = function () {
        this.initializeEffects()

        this.state = this.getSavedTableState() ?? this.defaultTableState

        this.resetButton = document.getElementById('reset-table-button')
        this.resetButton.onclick = this.resetTableButtonOnClick

        this.currentReputation = document.getElementById(`reputation|${this.state.reputation.value}`)
        this.currentFame = document.getElementById(`fame|${this.state.fame}`)

        this.logs = document.getElementById('logs')
        this.logs.innerHTML = this.state.logs

        this.reminders = document.getElementById('reminders')
        this.reminders.innerHTML = this.state.reminders

        this.currentPeriodScore = this.state.day.active === true ? document.getElementById('day-score') : document.getElementById('night-score')

        this.dayScore = document.getElementById('day-score')
        this.dayScore.textContent = this.state.day.count
        this.dayMovePoints = document.getElementById('day-move-points')

        this.nightScore = document.getElementById('night-score')
        this.nightScore.textContent = this.state.night.count
        this.nightMovePoints = document.getElementById('night-move-points')

        this.tacticDayCards = document.getElementById('tactic-day-cards')
        this.tacticNightCards = document.getElementById('tactic-night-cards')
        this.currentTacticCard = document.getElementById(`${this.state.tacticCards.current}`)
        this.selectTactic(this.currentTacticCard)

        this.state.tacticCards.disabled.forEach(tacticCardId => {
            let tacticCard = document.getElementById(tacticCardId)
            if (tacticCard) {
                this.disableTacticCard(tacticCard)
            }
        })

        if (this.state.day.active)
            this.day()

        if (this.state.night.active)
            this.night()

        this.markReputationTracker(this.currentReputation)
        this.markFameTracker(this.currentFame)

    }

    this.initializeEffects = function () {
        document.querySelectorAll('td .can-active').forEach(td => {
            td.addEventListener('mouseover', function () {
                this.classList.add('table-active')
            })
            td.addEventListener('mouseout', function () {
                this.classList.remove('table-active')
            })
            td.addEventListener('click', function () {
                this.classList.remove('table-active')
            })
        })

        $(".accordion-item").on("shown.bs.collapse", function () {
            var selected = $(this)
            var offcanvas = $('#canvasBody')
            if (selected.offset().top + selected.height() > offcanvas.offset().top + offcanvas.height()) {
                var scrollTop = (selected.offset().top - offcanvas.offset().top + offcanvas.scrollTop()) - 10
                offcanvas.animate({scrollTop: scrollTop}, 1000)
            }
        });

        document.querySelectorAll('.app-btn').forEach(btn => {
            btn.classList.add('btn', 'btn-dark', 'rounded-0');
        });
    }

    this.resetTableButtonOnClick = function (){
        if(!confirm("Are you sure? This will clear all board state"))
            return;

        document.body.classList.remove('loaded');

        setTimeout(function() {
            that.state = null

            localStorage.removeItem(StorageTableStateKey)

            localStorage.removeItem(StorageDummyPlayerKey)
            resetDummyScreen()

            that.removeHighlight(that.currentFame)
            that.removeHighlight(that.currentPeriodScore)
            that.removeHighlight(that.currentReputation)

            that.initialize()
            window.location.reload();
        }, 1000);
    }

    this.log = function (message, date = true) {
        if(date){
            this.logs.insertAdjacentHTML('afterbegin', `<p>${new Date().toLocaleString()} - ${message}</p>`)
        } else {
            this.logs.insertAdjacentHTML('afterbegin', `<p>${message}</p>`)
        }
        this.state.logs = this.logs.innerHTML
    }

    this.line = function() {
        this.logs.insertAdjacentHTML('afterbegin', `<p><hr></p>`)
        this.state.logs = this.logs.innerHTML
    }

    this.reminder = function (message) {
        let currentHeight = this.reminders.scrollHeight
        this.reminders.style.height = currentHeight + 'px'
        this.reminders.style.overflow = 'hidden'

        let isFirstReminder = this.state.reminders === ""
        if(isFirstReminder) {
            this.reminders.insertAdjacentHTML('afterbegin', `<p>Reminders</p>`)
        }

        let reminderTitle = this.reminders.querySelector('p')
        if(reminderTitle) {
            reminderTitle.insertAdjacentHTML('afterend', `<p>${message}</p>`)
        } else {
            this.reminders.insertAdjacentHTML('afterbegin', `<p>${message}</p>`)
        }

        // Calcula a nova altura e anima
        let newHeight = this.reminders.scrollHeight
        this.reminders.style.transition = 'height 1s ease-in'

        requestAnimationFrame(() => {
            this.reminders.style.height = newHeight + 'px'

            setTimeout(() => {
                this.reminders.style.transition = ''
                this.reminders.style.height = ''
                this.reminders.style.overflow = ''
                this.state.reminders = this.reminders.innerHTML
                this.save()
            }, 1000)
        })
    }

    this.markReputationTracker = function (newReputationElement) {
        this.addHighlight(newReputationElement)

        if (this.currentReputation === newReputationElement) return

        this.removeHighlight(this.currentReputation)

        let increasesOrDecreases = parseInt(newReputationElement.dataset.value) < parseInt(this.currentReputation.dataset.value) ? '↓' : '↑';
        this.log(`Reputation: ${this.currentReputation.textContent} → ${newReputationElement.textContent} ${increasesOrDecreases}`)

        this.state.reputation = {text: newReputationElement.textContent, value: newReputationElement.dataset.value}
        this.currentReputation = newReputationElement

        this.save()
    }

    this.markFameTracker = function (newFameElement) {
        this.addHighlight(newFameElement)

        if (this.currentFame === newFameElement) return

        this.removeHighlight(this.currentFame)

        let increases = parseInt(newFameElement.textContent) - parseInt(this.currentFame.textContent)
        increases = increases < 0 ? increases * - 1 : increases
        let increasesOrDecreases = parseInt(newFameElement.textContent) < parseInt(this.currentFame.textContent) ? '↓' : '↑';
        let origin = this.currentFame.textContent
        let destiny = newFameElement.textContent

        this.state.fame = newFameElement.textContent
        this.currentFame = newFameElement

        if(this.currentFame.dataset.leveluprow > this.state.level){
            let levelUpSymbolElement = document.querySelector(`.level-up-symbol[data-leveluprow="${this.currentFame.dataset.leveluprow}"]`)
            let message = `Fame: ${origin} → ${destiny} ${increasesOrDecreases} ${increases} - Level Up: ${levelUpSymbolElement.textContent}`
            this.log(message)

            this.reminder(message)
        }else{
            this.log(`Fame: ${origin} → ${destiny} ${increasesOrDecreases} ${increases}`)
        }

        this.state.level = this.currentFame.dataset.leveluprow
        this.save()
    }

    this.clearReminders = function () {
        let currentHeight = this.reminders.scrollHeight
        this.reminders.style.height = currentHeight + 'px'
        this.reminders.style.overflow = 'hidden'

        this.reminders.offsetHeight

        this.reminders.style.transition = 'height 1s ease-out'
        this.reminders.style.height = '0px'

        setTimeout(() => {
            this.state.reminders = ""
            this.reminders.innerHTML = ""
            this.reminders.style.height = ''
            this.reminders.style.overflow = ''
            this.reminders.style.transition = ''
            this.save()
        }, 1000)
    }

    this.show = function (element) {
        if (element != null)
            element.classList.remove("d-none")
    }

    this.hide = function (element) {
        if (element != null)
            element.classList.add("d-none")
    }

    this.addHighlight = function (element) {
        if (element != null)
            element.classList.add("bg-white", "text-dark")
    }
    this.removeHighlight = function (element) {
        if (element != null)
            element.classList.remove("bg-white", "text-dark")
    }

    this.increasesNightScore = function () {
        this.state.night.count++
        this.nightScore.textContent = this.state.night.count
    }

    this.increasesDayScore = function () {
        this.state.day.count++
        this.dayScore.textContent = this.state.day.count
    }

    this.changePeriod = function () {
        if (this.state.day.active)
            this.night()
        else
            this.day()

        this.disableTacticCard(this.currentTacticCard)
        this.currentTacticCard = null
    }

    this.night = function () {
        this.state.night.active = true
        this.addHighlight(this.nightScore)
        this.removeHighlight(this.dayScore)

        this.state.day.active = false
        this.hide(this.dayMovePoints)
        this.show(this.nightMovePoints)

        this.show(this.tacticNightCards)
        this.hide(this.tacticDayCards)

        document.body.classList.remove('day-period')
        document.body.classList.add('night-period')

        if(this.currentPeriodScore === this.nightScore && this.logs.textContent.length > 0){
            return
        }


        this.currentPeriodScore = this.nightScore
        this.increasesNightScore()

        this.line()
        this.log(`Round ${this.state.day.count + this.state.night.count}`, false)
        this.log('The Night has begun')

        this.save()
    }

    this.day = function () {
        this.state.day.active = true
        this.addHighlight(this.dayScore)
        this.show(this.dayMovePoints)

        this.state.night.active = false
        this.removeHighlight(this.nightScore)
        this.hide(this.nightMovePoints)

        this.show(this.tacticDayCards)
        this.hide(this.tacticNightCards)

        document.body.classList.add('day-period')
        document.body.classList.remove('night-period')

        if(this.currentPeriodScore === this.dayScore && this.logs.textContent.length > 0){
            return
        }

        this.currentPeriodScore = this.dayScore
        this.increasesDayScore()

        let round = this.state.day.count + this.state.night.count
        if(round > 1) this.line()
        this.log(`Round ${round}`, false)
        this.log('The Day has begun')

        this.save()
    }

    this.updateReputation = function (number) {
        let newReputationNumber = Number(this.state.reputation.value) + number
        let newReputation = document.getElementById(`reputation|${newReputationNumber}`)

        if (newReputation === null) return

        this.markReputationTracker(newReputation)
    }

    this.updateFame = function (number) {
        let newFameNumber = Number(this.state.fame) + number
        let newFame = document.getElementById(`fame|${newFameNumber}`)

        if (newFame === null) return

        this.markFameTracker(newFame)
    }

    this.selectTactic = function (tacticCardElement) {
        if(tacticCardElement === null) return

        this.addHighlight(tacticCardElement)
        let chooseBtn = document.getElementById(`choose-${tacticCardElement.id}`)
        this.show(chooseBtn)

        if (this.currentTacticCard === tacticCardElement) return
        this.removeHighlight(this.currentTacticCard)

        if(this.currentTacticCard != null){
            let id = this.currentTacticCard.id
            let oldChooseBtn = document.getElementById(`choose-${id}`)
            this.hide(oldChooseBtn)
        }

        this.state.tacticCards.current = tacticCardElement.id
        this.currentTacticCard = tacticCardElement

        let cardTitle = this.currentTacticCard.querySelector('.card-title').textContent;
        let cardHeader = this.currentTacticCard.querySelector('.card-header').textContent;
        this.log(`Tactic card chose: ${cardHeader} - ${cardTitle}`)

        this.save()
    }

    this.disableTacticCard = function (tacticCardElement) {
        if (this.currentTacticCard === null) return

        tacticCardElement.classList.add('text-bg-secondary')
        tacticCardElement.classList.remove('text-bg-dark')
        tacticCardElement.removeAttribute('onclick')
        tacticCardElement.classList.add('disabled')

        this.removeHighlight(tacticCardElement)

        let chooseBtn = document.getElementById(`choose-${tacticCardElement.id}`)
        this.hide(chooseBtn)

        this.state.tacticCards.disabled.push(tacticCardElement.id)
        this.save()
    }

    this.chooseDummyTacticCard = function (){
        if(!confirm("Are you sure? This will randomly choose a tactical card from the available ones for the Dummy Player"))
            return;

        let prefix = this.state.day.active ? 'day' : 'night';
        let allCards = [];
        for (let i = 1; i <= 6; i++) {
            allCards.push(`${prefix}-${i}`);
        }

        let availableCards = allCards.filter(cardId => {
            if (cardId === this.currentTacticCard.id) {
                return false;
            }
            return !this.state.tacticCards.disabled.includes(cardId);
        });

        if (availableCards.length === 0) return

        let randomIndex = Math.floor(Math.random() * availableCards.length);
        let randomCardId = availableCards[randomIndex];
        let randomCard = document.getElementById(randomCardId);

        if (randomCard) {
            this.disableTacticCard(randomCard);

            let cardTitle = randomCard.querySelector('.card-title').textContent;
            let cardHeader = randomCard.querySelector('.card-header').textContent;
            this.log(`Dummy Player - Tactic card chose: ${cardHeader} - ${cardTitle}`);
        }

        this.save()

    }

    this.endRound = function (){
        if(!confirm("Are you sure? This will switch day and night and bring the dummy player to the screen to add crystals and cards. If you didn't choose the dummy player, the screen won't be changed."))
            return;

        if(context.state != null){
            context.showItemInItems(context.screen3, context.screens);
        }

        tableState.log("Player - Ended the round");
        tableState.changePeriod()
        tableState.save()
    }

}