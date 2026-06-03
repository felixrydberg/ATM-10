ServerEvents.recipes(allthemods => {
    let centrifugeCount = 0
    let generatedCount = 0

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

            let isCombBlock = combItem === 'productivebees:configurable_comb'

            let results = []
            if (recipe.has('outputs')) {
                let outputs = recipe.getAsJsonArray('outputs')
                for (let i = 0; i < outputs.size(); i++) {
                    try {
                        let output = outputs.get(i).getAsJsonObject()
                        if (!output.has('item')) continue
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
                    } catch (e) {
                    }
                }
            }

            if (results.length === 0) {
                results.push({ id: 'productivebees:wax', count: 1 })
            }

            let beeName = beeType.split(':')[1]
            let suffix = isCombBlock ? '_comb_block' : '_honeycomb'

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
                heatRequirement: 'heated'
            }).id(`atm:create/mixing/${beeName}${suffix}`)

            generatedCount++
        } catch (e) {
        }
    })

    console.log(`[ATM] Create Mixer: found ${centrifugeCount} centrifuge recipes, generated ${generatedCount} mixing recipes`)
})
