ServerEvents.recipes(allthemods => {
    let centrifugeCount = 0
    let generatedCount = 0

    // Heat requirement lookup: bee name -> 'heated' or 'superheated'
    let heat = {}

    // === Superheated (Blaze Cake burner) - Endgame materials ===
    let superheatedBees = [
        'allthemodium', 'vibranium', 'unobtainium',
        'draconic', 'draconium', 'awakened_draconium',
        'netherite',
        'supremium', 'insanium',
        'infinity', 'chaos', 'starry',
        'crystal_matrix', 'neutronium',
        'insanite',
    ]
    superheatedBees.forEach(b => { heat[b] = 'superheated' })

    // === Heated (Blaze Burner) - Everything else ===
    // All other bees default to 'heated' via the fallback below

    allthemods.forEachRecipe({ type: 'productivebees:centrifuge' }, rawRecipe => {
        centrifugeCount++
        try {
            let recipe = rawRecipe.json

            if (!recipe.has('ingredient')) return
            let ingredient = recipe.getAsJsonObject('ingredient')

            let ingredientType = ingredient.has('type') ? ingredient.get('type') : null
            if (!ingredientType || ingredientType.getAsString() !== 'productivebees:component') return

            let itemsElem = ingredient.get('items')
            if (!itemsElem) return
            let combItem = itemsElem.getAsString()
            if (combItem !== 'productivebees:configurable_honeycomb' && combItem !== 'productivebees:configurable_comb') return

            if (!ingredient.has('components')) return
            let components = ingredient.getAsJsonObject('components')
            if (!components.has('productivebees:bee_type')) return
            let beeType = components.get('productivebees:bee_type').getAsString()
            let beeName = beeType.includes(':') ? beeType.split(':')[1] : beeType

            let isCombBlock = combItem === 'productivebees:configurable_comb'
            let suffix = isCombBlock ? '_comb_block' : '_honeycomb'

            let results = []
            if (recipe.has('outputs')) {
                let outputs = recipe.getAsJsonArray('outputs')
                for (let i = 0; i < outputs.size(); i++) {
                    try {
                        let output = outputs.get(i).getAsJsonObject()

                        if (output.has('item')) {
                            let itemObj = output.get('item')
                            if (!itemObj.isJsonObject()) continue
                            let item = itemObj.getAsJsonObject()
                            let idElem = item.has('item') ? item.get('item') : item.get('id')
                            if (!idElem) continue
                            let itemId = idElem.getAsString()
                            let count = item.has('count') ? item.get('count').getAsInt() : 1
                            if (output.has('chance')) {
                                let chance = output.get('chance').getAsInt()
                                if (chance > 0 && chance < 100) {
                                    results.push({ id: itemId, count: count, chance: chance / 100 })
                                } else {
                                    results.push({ id: itemId, count: count })
                                }
                            } else {
                                results.push({ id: itemId, count: count })
                            }
                        } else if (output.has('fluid')) {
                            let fluidObj = output.getAsJsonObject('fluid')
                            if (fluidObj.has('fluid')) {
                                results.push({ id: fluidObj.get('fluid').getAsString(), amount: output.get('amount').getAsInt() })
                            }
                        }
                    } catch (e) {
                    }
                }
            }

            if (results.length === 0) {
                results.push({ id: 'productivebees:honey', amount: isCombBlock ? 400 : 100 })
            }

            // Replace wax item with honey fluid — mixer produces honey, centrifuge keeps wax
            let hasWax = false
            for (let j = 0; j < results.length; j++) {
                if (results[j].id === 'productivebees:wax') {
                    results[j] = { id: 'productivebees:honey', amount: isCombBlock ? 400 : 100 }
                    hasWax = true
                    break
                }
            }
            if (!hasWax) {
                results.push({ id: 'productivebees:honey', amount: isCombBlock ? 400 : 100 })
            }

            allthemods.custom({
                type: 'create:mixing',
                ingredients: [
                    {
                        type: 'neoforge:components',
                        items: [combItem],
                        components: {
                            'productivebees:bee_type': beeType
                        }
                    }
                ],
                results: results,
                heat_requirement: heat[beeName] || 'heated'
            }).id(`felixrydberg:create/mixing/${beeName}${suffix}`)

            generatedCount++
        } catch (e) {
        }
    })

    console.log(`[ATM] Create Mixer: found ${centrifugeCount} centrifuge recipes, generated ${generatedCount} mixing recipes`)
})
