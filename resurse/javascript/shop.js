function toLower(string) { 
    let newString = "";
    
    for (let i = 0; i < string.length; ++i) {
        if (string[i] >= 'A' && string[i] <= 'Z') {
            newString += string[i].toLowerCase();
        } else {
            newString += string[i];
        }
    }

    return newString;
}

async function isValid(text, textarea) {
    for (let colour of text.split(",")) {
        colour = await toLower(colour);

        if (colour == "") {
            return false;
        }

        for (let letter of colour) {
            if (letter < 'a' || letter > 'z') {
                return false;
            }
        }
    }

    if (textarea.includes(",")) {
        return false;
    }

    for (let word of textarea.split(" ")) {
        if (word[0] != '+' && word[0] != '-') {
            return false;
        }
    }

    return true;
}

function checkColours(filter, item) {
    if (filter.length == 0) {
        return true;
    }

    for (let c1 of filter) {
        let found = false;

        for (let c2 of item) {
            if (toLower(c2) == toLower(c1)) {
                found = true;
                break;
            }
        }

        if (!found) {
            return false;
        }
    }

    return true;
}

function checkDescription(mustHave, mustMiss, item) {
    if (mustHave.length == 0 && mustMiss.length == 0) {
        return true;
    }
    
    if (mustMiss.length > 0) {
        for (let word of mustMiss) {
            if (toLower(item).includes(toLower(word))) {
                return false;
            }
        }
    }

    if (mustHave.length > 0) {
        for (let word of mustHave) {
            if (toLower(item).includes(toLower(word))) {
                return true;
            }
        }
    } else {
        return true;
    }

    return false;
}

function checkPrice(priceRanges, item) {
    for (let range of priceRanges) {
        let inf, sup;
        
        if (range[0] == '>') {
            inf = parseFloat(range.slice(1));

            if (item >= inf) {
                return true;
            }
        } else {
            range = range.split("-");
            inf = parseFloat(range[0]);
            sup = parseFloat(range[1]);

            if (item >= inf && item < sup) {
                return true;
            }
        }
    }

    return false;
}

window.addEventListener("load", function() {
    var range = document.getElementById("range-input");
    var currVal = document.createElement("span");

    range.parentNode.insertBefore(document.createTextNode(range.min + "g"), range);
    range.parentNode.appendChild(document.createTextNode(range.max + "g"));
    range.parentNode.appendChild(currVal);
    currVal.innerHTML = " (" + range.value + "g)";

    range.onchange = function() {
        range.nextSibling.nextSibling.innerHTML = " (" + this.value + "g)";
    }

    let button = document.getElementById("filter-button");

    button.onclick = async function() {
        let str1 = document.getElementById("text-input").value;
        let str2 = document.getElementById("textarea-input").value;

        // input validation
        if (!isValid(str1, str2)) {
            alert("The input is not valid. Refresh the page and try again.");
        } else {
            let colours = [];

            if (str1 != "") {
                colours = str1.split(",");
            }

            let weight = document.getElementById("range-input").value;

            let radiobuttons = document.getElementsByName("radio-group");
            let gender = "";

            for (let radio of radiobuttons) {
                if (radio.checked) {
                    gender = radio.value;
                    break;
                }
            }

            let checker = document.getElementById("check-input");
            let recycled = false;

            if (checker.checked) {
                recycled = true;
            }

            let mustHave = [], n1 = 0;
            let mustMiss = [], n2 = 0;

            if (str2 != "") {
                for (let word of str2.split(" ")) {
                    if (word[0] == '+') {
                        mustHave[n1++] = word.slice(1);
                    } else {
                        mustMiss[n2++] = word.slice(1);
                    }
                }
            }

            let category = document.getElementById("simple-select").value;
            let priceRanges = [], i = 0;

            for (let option of document.getElementById("multiple-select").options) {
                if (option.selected) {
                    priceRanges[i++] = option.value;
                }
            }

            var items = document.getElementsByClassName("shop-item"); 

            for (let item of items) {
                item.style.display = "none";

                let details = item.getElementsByClassName("idetail");

                let str = details[0].innerHTML,itemColours = [], n = 0; 
                for (let colour of str.split(",")) {
                    itemColours[n++] = colour;
                }

                let itemWeight = parseInt(details[2].innerHTML);
                let itemGender = details[6].innerHTML;
                let itemRecycled = details[3].innerHTML == "true";
                let itemDescription = details[1].innerHTML;
                let itemCategory = details[5].innerHTML;
                let itemPrice = parseFloat(details[4].innerHTML);

                let cond1 = checkColours(colours, itemColours);
                let cond2 = itemWeight <= weight;
                let cond3 = await toLower(itemGender) == await toLower(gender) || gender == "Unisex";
                let cond4 = recycled == true && itemRecycled == true || recycled == false;
                let cond5 = checkDescription(mustHave, mustMiss, itemDescription);
                let cond6 = await toLower(itemCategory) == await toLower(category) || await toLower(category) == "all";
                let cond7 = checkPrice(priceRanges, itemPrice);

                if (cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7) {
                    item.style.display = "flex";
                }
            }
        }
    }

    function sortItems(criteria) {
        var items = document.getElementsByClassName("shop-item");
        let itemsArray = Array.from(items);

        itemsArray.sort(function(itemX, itemY) {
            let priceX = parseFloat(itemX.getElementsByClassName("idetail")[4].innerHTML);
            let priceY = parseFloat(itemY.getElementsByClassName("idetail")[4].innerHTML);
            let nameX = itemX.getElementsByClassName("item-name")[0].getElementsByTagName("a")[0].innerHTML;
            let nameY = itemY.getElementsByClassName("item-name")[0].getElementsByTagName("a")[0].innerHTML;

            if (priceX < priceY || priceX == priceY && nameX < nameY) {
                return -1 * criteria;
            } else if (priceX > priceY || priceX == priceY && nameX > nameY) {
                return criteria;
            } else {
                return 0;
            }
        });

        for (let item of itemsArray) {
            item.parentNode.appendChild(item);
        }
    }

    button = document.getElementById("sort-asc");

    button.onclick = function() {
        sortItems(1);
    }

    button = document.getElementById("sort-desc");

    button.onclick = function() {
        sortItems(-1);
    }

    button = document.getElementById("min-price");

    button.onclick = function() {
        function getMinPrice() {
            var items = document.getElementsByClassName("shop-item");
            let minPrice = 100000;

            for (let item of items) {
                if (item.style.display != "none") {
                    let price = parseFloat(item.getElementsByClassName("idetail")[4].innerHTML);

                    if (price < minPrice) {
                        minPrice = price;
                    }
                }
            }

            return minPrice;
        }

        let infoPrice = document.createElement("div");
        infoPrice.innerHTML = "The cheapest product is only " + getMinPrice() + "£.";
        infoPrice.className = "info-price";

        button.parentNode.insertBefore(infoPrice, button.nextSibling);
        setTimeout(function() {
            infoPrice.remove();
        }, 5000);
    }

    button = document.getElementById("reset-button");

    button.onclick = function() {
        var items = document.getElementsByClassName("shop-item");

        for (let item of items) {
            item.style.display = "flex";
        }

        document.getElementById("text-input").value = "";
        document.getElementById("range-input").value = 900;
        currVal.innerHTML = " (900g)";
        
        var radio = document.getElementsByName("radio-group");
        radio[0].checked = true;

        for (let i = 1; i < radio.length; ++i) {
            radio[i].checked = false;
        }

        document.getElementById("check-input").checked = false;
        document.getElementById("textarea-input").value = "";
        document.getElementById("simple-select").value = "all";

        var prices = document.getElementById("multiple-select").options;

        for (let i = 0; i < prices.length; ++i) {
            prices[i].selected = true;
        }
    }
});