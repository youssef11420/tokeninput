/*!
 * TokenInput v1.0.0
 * © 2018 Youssef Imzourh
 * @license GNU GENERAL PUBLIC LICENSE
 */
(function (global, factory) {
    "use strict";

    if (typeof exports === "object" && module !== undefined) {
        module.exports = factory();
    } else {
        if (typeof define === "function" && define.amd) {
            define(factory);
        } else {
            global.TokenInput = factory();
        }
    }
}(this, function () {
    "use strict";

    var HTML_ESCAPES = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;"
    };

    var HTML_ESCAPE_CHARS = /[&<>"'\/]/g;

    function coerceToString(val) {
        return String((val === null || val === undefined)
            ? ""
            : val);
    }

    function _escapeHTML(text) {
        return coerceToString(text).replace(HTML_ESCAPE_CHARS, function (match) {
            return HTML_ESCAPES[match];
        });
    }

    var DEFAULT_SETTINGS = {
        // Search settings
        method: "GET",
        queryParam: "q",
        searchDelay: 300,
        minChars: 1,
        doSearchOnFocus: false,
        propertyToSearch: "name",
        jsonContainer: null,
        contentType: "json",
        excludeCurrent: false,
        excludeCurrentParameter: "x",

        // Prepopulation settings
        prePopulate: null,
        processPrePopulate: false,

        // Display settings
        hintText: "Type in a search term",
        noResultsText: "No results",
        searchingText: "Searching...",
        deleteText: "&#215;",
        animateDropdown: true,
        placeholder: null,
        theme: null,
        zindex: 999,
        resultsLimit: null,

        enableHTML: false,

        resultsFormatter: function (item) {
            var string = item[this.propertyToSearch];

            return "<li>" + (this.enableHTML
                ? string
                : _escapeHTML(string));
        },

        tokenFormatter: function (item) {
            var string = item[this.propertyToSearch];

            return "<li><p>" + (this.enableHTML
                ? string
                : _escapeHTML(string)) + "</p>";
        },

        // Tokenization settings
        tokenLimit: null,
        tokenDelimiter: ",",
        preventDuplicates: false,
        tokenValue: "id",

        // Behavioral settings
        allowFreeTagging: false,
        allowTabOut: false,
        autoSelectFirstResult: false,

        // Callbacks
        onResult: null,
        onCachedResult: null,
        onAdd: null,
        onFreeTaggingAdd: null,
        onDelete: null,
        onReady: null,

        // Other settings
        idPrefix: "token-input-",

        // Keep track if the input is currently in disabled mode
        disabled: false
    };

    // Default classes to use when theming
    var DEFAULT_CLASSES = {
        tokenList: "token-input-list",
        token: "token-input-token",
        tokenReadOnly: "token-input-token-readonly",
        tokenDelete: "token-input-delete-token",
        selectedToken: "token-input-selected-token",
        highlightedToken: "token-input-highlighted-token",
        dropdown: "token-input-dropdown",
        dropdownItem: "token-input-dropdown-item",
        dropdownItem2: "token-input-dropdown-item2",
        selectedDropdownItem: "token-input-selected-dropdown-item",
        inputToken: "token-input-input-token",
        focused: "token-input-focused",
        disabled: "token-input-disabled"
    };

    // Input box position "enum"
    var POSITION = {
        BEFORE: 0,
        AFTER: 1,
        END: 2
    };

    // Keys "enum"
    var KEY = {
        BACKSPACE: 8,
        DELETE: 46,
        TAB: 9,
        ENTER: 13,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        NUMPAD_ENTER: 108,
        COMMA: 188
    };

    function createElementFromHTML(htmlString, parentTag) {
        var div = document.createElement(parentTag || "div");
        div.innerHTML = htmlString.trim();

        // Change this to div.childNodes to support multiple top-level nodes
        return div.firstChild;
    }

    // Really basic cache for the results
    var TokenListCache = function (options) {
        var settings = {max_size: 500};
        var data = {};
        var size = 0;
        var flush;

        options = options || {};
        Object.keys(options).forEach(function (attrname) {
            settings[attrname] = options[attrname];
        });

        flush = function () {
            data = {};
            size = 0;
        };

        this.add = function (query, results) {
            if (size > settings.max_size) {
                flush();
            }

            if (!data[query]) {
                size += 1;
            }

            data[query] = results;
        };

        this.get = function (query) {
            return data[query];
        };
    };

    // TokenList class for each input
    var TokenList = function (input, url_or_data, settings) {
        //
        // Initialization
        //

        //
        // Private functions
        //

        // Bring browser focus to the specified object.
        // Use of window.setTimeout is to get around an IE bug.
        // (See, e.g., http://stackoverflow.com/questions/2600186/focus-doesnt-work-in-ie)
        //
        // obj: a jQuery object to focus()
        function focusWithTimeout(object) {
            object.focus();
        }

        function escapeHTML(text) {
            return input.tokenInputsettings.enableHTML
                ? text
                : _escapeHTML(text);
        }

        // compute the dynamic URL
        function computeURL() {
            var tokenInputsettings = input.tokenInputsettings;
            return typeof tokenInputsettings.url === "function"
                ? tokenInputsettings.url.call(tokenInputsettings)
                : tokenInputsettings.url;
        }

        // Configure the data source
        if (typeof(url_or_data) === "string" || typeof(url_or_data) === "function") {
            // Set the url to query against
            input.tokenInputsettings.url = url_or_data;

            // If the URL is a function, evaluate it here to do our initalization work
            var url = computeURL();

            // Make a smart guess about cross-domain if it wasn't explicitly specified
            if (input.tokenInputsettings.crossDomain === undefined && typeof url === "string") {
                if (url.indexOf("://") === -1) {
                    input.tokenInputsettings.crossDomain = false;
                } else {
                    input.tokenInputsettings.crossDomain = (window.location.href.split(/\/+/g)[1] !== url.split(/\/+/g)[1]);
                }
            }
        } else if (typeof(url_or_data) === "object") {
            // Set the local data to search through
            input.tokenInputsettings.local_data = url_or_data;
        }

        // Build class names
        if (input.tokenInputsettings.classes) {
            // Use custom class names
            var classes = {};
            Object.keys(DEFAULT_CLASSES).forEach(function (key) {
                classes[key] = DEFAULT_CLASSES[key];
            });
            Object.keys(input.tokenInputsettings.classes).forEach(function (key) {
                classes[key] = input.tokenInputsettings.classes[key];
            });
            input.tokenInputsettings.classes = classes;
        } else if (input.tokenInputsettings.theme) {
            // Use theme-suffixed default class names
            input.tokenInputsettings.classes = {};
            Object.keys(DEFAULT_CLASSES).forEach(function (key) {
                input.tokenInputsettings.classes[key] = DEFAULT_CLASSES[key] + "-" + input.tokenInputsettings.theme;
            });
        } else {
            input.tokenInputsettings.classes = DEFAULT_CLASSES;
        }

        // Save the tokens
        var saved_tokens = [];

        // Keep track of the number of tokens in the list
        var token_count = 0;

        // Basic cache to save on db hits
        var cache = new TokenListCache();

        // Keep track of the timeout, old vals
        var timeout;
        var input_val;
        var hiddenInput = input;
        var selected_dropdown_item = null;

        // Remove highlighting from an item in the results dropdown
        function deselect_dropdown_item(item) {
            if (item !== null) {
                item.classList.remove(input.tokenInputsettings.classes.selectedDropdownItem);
            }
            selected_dropdown_item = null;
        }

        // exclude existing tokens from dropdown, so the list is clearer
        function excludeCurrent(results) {
            if (input.tokenInputsettings.excludeCurrent) {
                var currentTokens = input.tokenInputObject.getTokens();
                var trimmedList = [];
                if (currentTokens.length) {
                    results.forEach(function (value) {
                        var notFound = true;

                        currentTokens.forEach(function (cValue) {
                            if (value[input.tokenInputsettings.propertyToSearch] === cValue[input.tokenInputsettings.propertyToSearch]) {
                                notFound = false;
                                return false;
                            }
                        });

                        if (notFound) {
                            trimmedList.push(value);
                        }
                    });
                    results = trimmedList;
                }
            }

            return results;
        }

        var regexp_special_chars = new RegExp("[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]", "g");
        function regexp_escape(term) {
            return term.replace(regexp_special_chars, "\\$&");
        }

        // Highlight the query part of the search term
        function highlight_term(value, term) {
            return value.replace(
                new RegExp(
                    "(?![^&;]+;)(?!<[^<>]*)(" + regexp_escape(term) + ")(?![^<>]*>)(?![^&;]+;)",
                    "gi"
                ),
                function (match, p1) {
                    var p1Res = escapeHTML(p1);
                    if (p1Res && match) {
                        p1Res = "<strong>" + p1Res + "</strong>";
                    }
                    return p1Res;
                }
            );
        }

        function find_value_and_highlight_term(template, value, term) {
            return template.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + regexp_escape(value) + ")(?![^<>]*>)(?![^&;]+;)", "g"), highlight_term(value, term));
        }

        // The list to store the token items in
        var token_list = document.createElement("ul");
        token_list.classList.add(input.tokenInputsettings.classes.tokenList);
        hiddenInput.parentNode.insertBefore(token_list, hiddenInput);

        // Create a new text input an attach keyup events
        var input_box_id = input.tokenInputsettings.idPrefix + input.id;
        var input_box = document.createElement("input");
        input_box.setAttribute("autocomplete", "off");
        input_box.style.outline = "none";
        input_box.id = input_box_id;

        // The token holding the input box
        var input_token = document.createElement("li");
        input_token.classList.add(input.tokenInputsettings.classes.inputToken);
        input_token.appendChild(input_box);
        token_list.appendChild(input_token);

        // The list to store the dropdown items in
        var dropdown = document.createElement("div");
        dropdown.classList.add(input.tokenInputsettings.classes.dropdown);
        document.body.appendChild(dropdown);
        dropdown.style.display = "none";

        function show_dropdown() {
            dropdown.style.position = "absolute";
            dropdown.style.top = (token_list.getBoundingClientRect().top + document.body.scrollTop + token_list.offsetHeight + parseInt(window.getComputedStyle(token_list).marginTop.replace(/px$/, ""), 10) + parseInt(window.getComputedStyle(token_list).marginBottom.replace(/px$/, ""), 10)) + "px";
            dropdown.style.left = (token_list.getBoundingClientRect().left + document.body.scrollLeft) + "px";
            dropdown.style.width = token_list.offsetWidth + "px";
            dropdown.style.zIndex = input.tokenInputsettings.zindex;
            dropdown.style.display = "";
        }

        // Update the hidden input box value
        function update_hiddenInput(saved_tokens, hiddenInput) {
            var token_values = saved_tokens.map(function (el) {
                if (typeof input.tokenInputsettings.tokenValue === "function") {
                    return input.tokenInputsettings.tokenValue.call(this, el);
                }

                return el[input.tokenInputsettings.tokenValue];
            });
            hiddenInput.value = token_values.join(input.tokenInputsettings.tokenDelimiter);

        }

        // Keep a reference to the selected token and dropdown item
        var selected_token = null;

        // Hide and clear the results dropdown
        function hide_dropdown() {
            dropdown.style.display = "none";
            dropdown.innerHTML = "";
            selected_dropdown_item = null;
        }

        // Select a token in the token list
        function select_token(token) {
            if (!input.tokenInputsettings.disabled) {
                token.classList.add(input.tokenInputsettings.classes.selectedToken);
                selected_token = token;

                // Hide input box
                input_box.value = "";

                // Hide dropdown if it is visible (eg if we clicked to select token)
                hide_dropdown();
            }
        }

        var selected_token_index = 0;

        // Delete a token from the token list
        function delete_token(token) {
            // Remove the id from the saved list
            var token_data = token.tokeninput;
            var callback = input.tokenInputsettings.onDelete;

            var prevAll = true;
            var prevAllArray = [];
            prevAll = prevAllArray.filter.call(token.parentNode.children, function (htmlElement) {
                if (htmlElement === token) {
                    prevAll = false;
                }
                return prevAll;
            });
            var index = prevAll.length;
            if (index > selected_token_index) {
                index -= 1;
            }

            // Delete the token
            token.parentNode.removeChild(token);
            selected_token = null;

            // Show the input box and give it focus again
            focusWithTimeout(input_box);

            // Remove this token from the saved list
            saved_tokens = saved_tokens.slice(0, index).concat(saved_tokens.slice(index + 1));
            if (saved_tokens.length === 0) {
                input_box.setAttribute("placeholder", settings.placeholder);
            }
            if (index < selected_token_index) {
                selected_token_index -= 1;
            }

            // Update the hidden input
            update_hiddenInput(saved_tokens, hiddenInput);

            token_count -= 1;

            if (input.tokenInputsettings.tokenLimit !== null) {
                input_box.style.display = "";
                input_box.value = "";
                focusWithTimeout(input_box);
            }

            // Execute the onDelete callback if defined
            if (typeof(callback) === "function") {
                callback.call(hiddenInput, token_data);
            }
        }

        // Inner function to a token to the list
        function insert_token(item) {
            var $this_token = createElementFromHTML(input.tokenInputsettings.tokenFormatter(item), "ul");
            var readonly = item.readonly === true;

            if (readonly) {
                $this_token.classList.add(input.tokenInputsettings.classes.tokenReadOnly);
            }

            $this_token.classList.add(input.tokenInputsettings.classes.token);
            input_token.parentNode.insertBefore($this_token, input_token);

            // The "delete token" button
            if (!readonly) {
                var link = document.createElement("a");
                link.href = "#";
                link.innerHTML = input.tokenInputsettings.deleteText;
                link.classList.add(input.tokenInputsettings.classes.tokenDelete);
                $this_token.appendChild(link);
                link.addEventListener("focus", function () {
                    if (!input.tokenInputsettings.disabled) {
                        select_token(this.parentNode);
                    }
                });
                link.addEventListener("click", function (event) {
                    if (!input.tokenInputsettings.disabled) {
                        delete_token(this.parentNode);
                        hiddenInput.dispatchEvent(new Event("change"));
                    }
                    event.preventDefault();
                    event.stopPropagation();
                });
                link.addEventListener("keyup", function (event) {
                    if (event.keyCode === KEY.BACKSPACE || event.keyCode === KEY.DELETE) {
                        delete_token(this.parentNode);
                        hiddenInput.dispatchEvent(new Event("change"));
                    }
                    event.preventDefault();
                    event.stopPropagation();
                });
            }

            // Store data on the token
            var token_data = item;
            $this_token.tokeninput = item;

            // Save this token for duplicate checking
            saved_tokens = saved_tokens.slice(0, selected_token_index).concat([token_data]).concat(saved_tokens.slice(selected_token_index));
            selected_token_index += 1;

            // Update the hidden input
            update_hiddenInput(saved_tokens, hiddenInput);

            token_count += 1;

            // Check the token limit
            if (input.tokenInputsettings.tokenLimit !== null && token_count >= input.tokenInputsettings.tokenLimit) {
                input_box.style.display = "none";
                hide_dropdown();
            }

            return $this_token;
        }

        function checkTokenLimit() {
            if (input.tokenInputsettings.tokenLimit !== null && token_count >= input.tokenInputsettings.tokenLimit) {
                input_box.style.display = "none";
                hide_dropdown();
            }
        }

        // Add a token to the token list based on user input
        function add_token(item) {
            var callback = input.tokenInputsettings.onAdd;

            // See if the token already exists and select it if we don't want duplicates
            if (token_count > 0 && input.tokenInputsettings.preventDuplicates) {
                var found_existing_token = null;
                [].forEach.call(token_list.children, function (existing_token) {
                    var existing_data = existing_token.tokeninput;
                    if (existing_data && existing_data[settings.tokenValue] === item[settings.tokenValue]) {
                        found_existing_token = existing_token;
                        return false;
                    }
                });

                if (found_existing_token) {
                    select_token(found_existing_token);
                    found_existing_token.parentNode.insertBefore(input_token, found_existing_token.nextElementSibling);
                    focusWithTimeout(input_box);
                    return;
                }
            }

            // Squeeze input_box so we force no unnecessary line break
            input_box.style.width = "1px";

            // Insert the new tokens
            if (input.tokenInputsettings.tokenLimit === null || token_count < input.tokenInputsettings.tokenLimit) {
                insert_token(item);
                // Remove the placeholder so it's not seen after you've added a token
                input_box.removeAttribute("placeholder");
                checkTokenLimit();
            }

            // Clear input box
            input_box.value = "";

            // Don't show the help dropdown, they've got the idea
            hide_dropdown();

            // Execute the onAdd callback if defined
            if (typeof(callback) === "function") {
                callback.call(hiddenInput, item);
            }
        }

        // Highlight an item in the results dropdown
        function select_dropdown_item(item) {
            var parent;

            if (item) {
                if (selected_dropdown_item) {
                    deselect_dropdown_item(selected_dropdown_item);
                }

                item.classList.add(input.tokenInputsettings.classes.selectedDropdownItem);

                parent = item.parentNode;

                var indexArray = [];
                var index = indexArray.slice.call(item.parentNode.children).indexOf(item);
                if (item.offsetHeight * index >= parent.scrollTop + parent.offsetHeight) {
                    parent.scrollTop = item.offsetHeight * (index + 1) - parent.offsetHeight;
                }
                if (item.offsetHeight * index <= parent.scrollTop) {
                    parent.scrollTop = item.offsetHeight * index;
                }

                selected_dropdown_item = item;
            }
        }

        // Populate the results dropdown with some results
        function populateDropdown(query, results) {
            // exclude current tokens if configured
            results = excludeCurrent(results);

            if (results && results.length) {
                dropdown.innerHTML = "";
                deselect_dropdown_item(selected_dropdown_item);
                var dropdown_ul = document.createElement("ul");
                dropdown.appendChild(dropdown_ul);
                dropdown_ul.addEventListener("mouseover", function (event) {
                    var htmlElement = event.target;
                    var parents = [];

                    do {
                        if (htmlElement.matches && htmlElement.matches("li")) {
                            parents.push(htmlElement);
                        }
                        htmlElement = htmlElement.parentNode;
                    } while (htmlElement);
                    select_dropdown_item(parents[0]);
                });
                dropdown_ul.addEventListener("mousedown", function (event) {
                    var htmlElement = event.target;
                    var parents = [];

                    do {
                        if (htmlElement.matches && htmlElement.matches("li")) {
                            parents.push(htmlElement);
                        }
                        htmlElement = htmlElement.parentNode;
                    } while (htmlElement);
                    add_token(parents[0].tokeninput);
                    hiddenInput.dispatchEvent(new Event("change"));
                    return false;
                });
                dropdown_ul.style.display = "none";

                if (input.tokenInputsettings.resultsLimit && results.length > input.tokenInputsettings.resultsLimit) {
                    results = results.slice(0, input.tokenInputsettings.resultsLimit);
                }

                results.forEach(function (value, index) {
                    var this_li = input.tokenInputsettings.resultsFormatter(value);

                    this_li = find_value_and_highlight_term(this_li, value[input.tokenInputsettings.propertyToSearch], query);
                    dropdown_ul.insertAdjacentHTML("beforeEnd", this_li);
                    this_li = dropdown_ul.lastChild;

                    if (index % 2 === 1) {
                        this_li.classList.add(input.tokenInputsettings.classes.dropdownItem);
                    } else {
                        this_li.classList.add(input.tokenInputsettings.classes.dropdownItem2);
                    }

                    if (index === 0 && input.tokenInputsettings.autoSelectFirstResult) {
                        select_dropdown_item(this_li);
                    }

                    this_li.tokeninput = value;
                });

                show_dropdown();

                if (input.tokenInputsettings.animateDropdown) {
                    dropdown_ul.classList.add("fast_animate");
                } else {
                    dropdown_ul.style.display = "";
                }
            } else {
                if (input.tokenInputsettings.noResultsText) {
                    dropdown.innerHTML = "<p>" + escapeHTML(input.tokenInputsettings.noResultsText) + "</p>";
                    show_dropdown();
                }
            }
        }

        // Do the actual search
        function run_search(query) {
            var cache_key = query + computeURL();
            var cached_results = cache.get(cache_key);

            if (cached_results) {
                if (typeof(input.tokenInputsettings.onCachedResult) === "function") {
                    cached_results = input.tokenInputsettings.onCachedResult.call(hiddenInput, cached_results);
                }
                populateDropdown(query, cached_results);
            } else {
                // Are we doing an ajax search or local data search?
                if (input.tokenInputsettings.url) {
                    var ajaxUrl = computeURL();
                    // Extract existing get params
                    var ajax_params = {};

                    ajax_params.data = {};
                    if (ajaxUrl.indexOf("?") > -1) {
                        var parts = ajaxUrl.split("?");
                        ajax_params.url = parts[0];

                        var param_array = parts[1].split("&");
                        param_array.forEach(function (value) {
                            var kv = value.split("=");
                            ajax_params.data[kv[0]] = kv[1];
                        });
                    } else {
                        ajax_params.url = ajaxUrl;
                    }

                    // Prepare the request
                    ajax_params.data[input.tokenInputsettings.queryParam] = query;
                    ajax_params.type = input.tokenInputsettings.method;
                    ajax_params.dataType = input.tokenInputsettings.contentType;
                    if (input.tokenInputsettings.crossDomain) {
                        ajax_params.dataType = "jsonp";
                    }

                    // exclude current tokens?
                    // send exclude list to the server, so it can also exclude existing tokens
                    if (input.tokenInputsettings.excludeCurrent) {
                        var currentTokens = input.tokenInputObject.getTokens();
                        var tokenList = currentTokens.map(function (el) {
                            if (typeof input.tokenInputsettings.tokenValue === "function") {
                                return input.tokenInputsettings.tokenValue.call(this, el);
                            }

                            return el[input.tokenInputsettings.tokenValue];
                        });

                        ajax_params.data[input.tokenInputsettings.excludeCurrentParameter] = tokenList.join(input.tokenInputsettings.tokenDelimiter);
                    }

                    // Attach the success callback
                    ajax_params.success = function () {
                        var results = JSON.parse(this.responseText);

                        cache.add(cache_key, input.tokenInputsettings.jsonContainer
                            ? results[input.tokenInputsettings.jsonContainer]
                            : results);
                        if (typeof(input.tokenInputsettings.onResult) === "function") {
                            results = input.tokenInputsettings.onResult.call(hiddenInput, results);
                        }

                        // only populate the dropdown if the results are associated with the active search query
                        if (input_box.value === query) {
                            populateDropdown(query, input.tokenInputsettings.jsonContainer
                                ? results[input.tokenInputsettings.jsonContainer]
                                : results);
                        }
                    };

                    // Provide a beforeSend callback
                    if (settings.onSend) {
                        settings.onSend(ajax_params);
                    }

                    // Make the request
                    var get = new XMLHttpRequest();
                    var method = ajax_params.type || "GET";
                    var dataStr = [];
                    var obj = (ajax_params.data || null);
                    Object.keys(obj).forEach(function (p) {
                        dataStr.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    });
                    dataStr = dataStr.join("&");
                    get.open(method, ajax_params.url + ((method === "GET" && dataStr)
                        ? "?" + dataStr
                        : ""), true);
                    get.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    get.send((method === "POST" && dataStr)
                        ? dataStr
                        : null);
                    get.addEventListener("load", ajax_params.success);
                } else if (input.tokenInputsettings.local_data) {
                    // Do the search through local data
                    var results = input.tokenInputsettings.local_data.filter(function (row) {
                        return row[input.tokenInputsettings.propertyToSearch].toLowerCase().indexOf(query.toLowerCase()) > -1;
                    });

                    cache.add(cache_key, results);
                    if (typeof(input.tokenInputsettings.onResult) === "function") {
                        results = input.tokenInputsettings.onResult.call(hiddenInput, results);
                    }
                    populateDropdown(query, results);
                }
            }
        }

        function show_dropdown_searching() {
            if (input.tokenInputsettings.searchingText) {
                dropdown.innerHTML = "<p>" + escapeHTML(input.tokenInputsettings.searchingText) + "</p>";
                show_dropdown();
            }
        }

        // Deselect a token in the token list
        function deselect_token(token, position) {
            token.classList.remove(input.tokenInputsettings.classes.selectedToken);
            selected_token = null;

            if (position === POSITION.BEFORE) {
                token.parentNode.insertBefore(input_token, token);
                selected_token_index -= 1;
            } else if (position === POSITION.AFTER) {
                token.parentNode.insertBefore(input_token, token.nextElementSibling);
                selected_token_index += 1;
            } else {
                token_list.appendChild(input_token);
                selected_token_index = token_count;
            }

            // Show the input box and give it focus again
            focusWithTimeout(input_box);
        }

        // Do a search and show the "searching" dropdown if the input is longer
        // than input.tokenInputsettings.minChars
        function do_search() {
            var query = input_box.value;

            if (selected_token) {
                deselect_token(selected_token, POSITION.AFTER);
            }

            if (query.length >= input.tokenInputsettings.minChars) {
                show_dropdown_searching();
                window.clearTimeout(timeout);

                timeout = window.setTimeout(function () {
                    run_search(query);
                }, input.tokenInputsettings.searchDelay);
            } else {
                hide_dropdown();
            }
        }

        function show_dropdown_hint() {
            if (input.tokenInputsettings.hintText) {
                dropdown.innerHTML = "<p>" + escapeHTML(input.tokenInputsettings.hintText) + "</p>";
                show_dropdown();
            }
        }

        function add_freetagging_tokens() {
            var value = input_box.value.trim();
            var tokens = value.split(input.tokenInputsettings.tokenDelimiter);

            tokens.forEach(function (token) {
                if (!token) {
                    return;
                }

                if (typeof(input.tokenInputsettings.onFreeTaggingAdd) === "function") {
                    token = input.tokenInputsettings.onFreeTaggingAdd.call(hiddenInput, token);
                }
                var object = {};
                object[input.tokenInputsettings.propertyToSearch] = token;
                object[input.tokenInputsettings.tokenValue] = token;
                add_token(object);
            });
        }

        // Magic element to help us resize the text input
        var input_resizer = document.createElement("tester");
        input_box.parentNode.insertBefore(input_resizer, input_box.nextElementSibling);
        input_resizer.style.position = "absolute";
        input_resizer.style.top = "-9999px";
        input_resizer.style.left = "-9999px";
        input_resizer.style.width = "auto";
        var computedStyles = window.getComputedStyle(input_box);
        input_resizer.style.fontSize = computedStyles.fontSize;
        input_resizer.style.fontFamily = computedStyles.fontFamily;
        input_resizer.style.fontWeight = computedStyles.fontWeight;
        input_resizer.style.letterSpacing = computedStyles.letterSpacing;
        input_resizer.style.whiteSpace = "nowrap";

        function resize_input() {
            if (input_val === input_box.value) {
                return;
            }
            input_val = input_box.value;

            // Get width left on the current line
            var width_left = token_list.offsetWidth - input_box.offsetLeft;
            // Enter new content into resizer and resize input accordingly
            input_resizer.innerHTML = _escapeHTML(input_val) || _escapeHTML(settings.placeholder);
            // Get maximum width, minimum the size of input and maximum the widget's width
            input_box.style.width = (Math.min(token_list.offsetWidth, Math.max(width_left, input_resizer.offsetWidth + 30)) - 16) + "px";
        }

        // Toggles the widget between enabled and disabled state, or according
        // to the [disable] parameter.
        function toggleDisabled(disable) {
            input.tokenInputsettings.disabled = typeof disable === "boolean"
                ? disable
                : !input.tokenInputsettings.disabled;
            input_box.disabled = input.tokenInputsettings.disabled;
            token_list.classList.toggle(input.tokenInputsettings.classes.disabled, input.tokenInputsettings.disabled);
            // if there is any token selected we deselect it
            if (selected_token) {
                deselect_token(selected_token, POSITION.END);
            }
            hiddenInput.disabled = input.tokenInputsettings.disabled;
        }

        input_box.addEventListener("focus", function () {
            if (input.tokenInputsettings.disabled) {
                return false;
            }
            if (input.tokenInputsettings.tokenLimit === null || input.tokenInputsettings.tokenLimit !== token_count) {
                if (this.value || !input.tokenInputsettings.doSearchOnFocus) {
                    show_dropdown_hint();
                } else {
                    do_search();
                }
            }
            token_list.classList.add(input.tokenInputsettings.classes.focused);
        });
        input_box.addEventListener("blur", function () {
            hide_dropdown();

            if (input.tokenInputsettings.allowFreeTagging) {
                add_freetagging_tokens();
            }

            this.value = "";
            token_list.classList.remove(input.tokenInputsettings.classes.focused);
        });
        input_box.addEventListener("keyup", resize_input);
        input_box.addEventListener("blur", resize_input);
        input_box.addEventListener("update", resize_input);
        input_box.addEventListener("keydown", function (event) {
            resize_input();

            var previous_token;
            var next_token;
            var dropdown_item = null;
            var kb_codes;

            switch (event.keyCode) {
            case KEY.LEFT:
            case KEY.RIGHT:
                if (this.value.length === 0) {
                    previous_token = input_token.previousElementSibling;
                    next_token = input_token.nextElementSibling;

                    if ((previous_token && previous_token === selected_token) || (next_token && next_token === selected_token)) {
                        // Check if there is a previous/next token and it is selected
                        if (event.keyCode === KEY.LEFT) {
                            deselect_token(selected_token, POSITION.BEFORE);
                        } else {
                            deselect_token(selected_token, POSITION.AFTER);
                        }
                    } else if (event.keyCode === KEY.LEFT && previous_token) {
                        // We are moving left, select the previous token if it exists
                        select_token(previous_token);
                    } else if (event.keyCode === KEY.RIGHT && next_token) {
                        // We are moving right, select the next token if it exists
                        select_token(next_token);
                    }
                } else {
                    if (event.keyCode === KEY.DOWN || event.keyCode === KEY.RIGHT) {
                        dropdown_item = dropdown.querySelector("li:first-child");

                        if (selected_dropdown_item) {
                            dropdown_item = selected_dropdown_item.nextElementSibling;
                        }
                    } else {
                        dropdown_item = dropdown.querySelector("li:last-child");

                        if (selected_dropdown_item) {
                            dropdown_item = selected_dropdown_item.previousElementSibling;
                        }
                    }

                    select_dropdown_item(dropdown_item);
                }

                break;

            case KEY.DOWN:
            case KEY.UP:
                if (event.keyCode === KEY.DOWN) {
                    dropdown_item = dropdown.querySelector("li:first-child");

                    if (selected_dropdown_item) {
                        dropdown_item = selected_dropdown_item.nextElementSibling;
                    }
                } else {
                    dropdown_item = dropdown.querySelector("li:last-child");

                    if (selected_dropdown_item) {
                        dropdown_item = selected_dropdown_item.previousElementSibling;
                    }
                }

                if (dropdown.querySelectorAll(":scope>ul").length === 0) {
                    // set a timeout just long enough to let this function finish.
                    window.setTimeout(function () {
                        do_search();
                    }, 5);
                }

                select_dropdown_item(dropdown_item);

                break;
            case KEY.BACKSPACE:
                previous_token = input_token.previousElementSibling;

                if (this.value.length === 0) {
                    if (selected_token) {
                        delete_token(selected_token);
                        hiddenInput.dispatchEvent(new Event("change"));
                    } else if (previous_token) {
                        select_token(previous_token);
                    }

                    return false;
                }
                if (this.value.length === 1) {
                    hide_dropdown();
                } else {
                    // set a timeout just long enough to let this function finish.
                    window.setTimeout(function () {
                        do_search();
                    }, 5);
                }
                break;

            case KEY.TAB:
            case KEY.ENTER:
            case KEY.NUMPAD_ENTER:
            case KEY.COMMA:
                if (selected_dropdown_item) {
                    add_token(selected_dropdown_item.tokeninput);
                    hiddenInput.dispatchEvent(new Event("change"));
                } else {
                    if (input.tokenInputsettings.allowFreeTagging) {
                        if (input.tokenInputsettings.allowTabOut && this.value === "") {
                            return true;
                        }
                        add_freetagging_tokens();
                    } else {
                        this.value = "";
                        if (input.tokenInputsettings.allowTabOut) {
                            return true;
                        }
                    }
                    event.stopPropagation();
                    event.preventDefault();
                }
                return false;

            case KEY.ESCAPE:
                hide_dropdown();
                return true;

            default:
                kb_codes = [19, 18, 17, 16, 92, 93, 45, 46, 33, 34, 35, 36, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 145, 111, 106, 109, 107];
                if (String.fromCharCode(event.which).length > 0 && kb_codes.indexOf(event.which) === -1) {
                    // set a timeout just long enough to let this function finish.
                    window.setTimeout(function () {
                        do_search();
                    }, 5);
                }
            }
        });

        var label = document.querySelector("label[for='" + input.id + "'");
        if (label) {
            label.setAttribute("for", input_box_id);
        }

        // Keep reference for placeholder
        if (settings.placeholder) {
            input_box.setAttribute("placeholder", settings.placeholder);
        }

        // Keep a reference to the original input box
        input.style.display = "none";
        input.value = "";
        input.addEventListener("focus", function () {
            focusWithTimeout(input_box);
        });
        input.addEventListener("blur", function () {
            input_box.blur();

            //return the object to this can be referenced in the callback functions.
            return hiddenInput;
        });

        // Toggle selection of a token in the token list
        function toggle_select_token(token) {
            var previous_selected_token = selected_token;

            if (selected_token) {
                deselect_token(selected_token, POSITION.END);
            }

            if (previous_selected_token === token) {
                deselect_token(token, POSITION.END);
            } else {
                select_token(token);
            }
        }

        token_list.addEventListener("click", function (event) {
            var li = [];
            var htmlElement = event.target;
            do {
                if (htmlElement.matches && htmlElement.matches("li")) {
                    li.push(htmlElement);
                }
                htmlElement = htmlElement.parentNode;
            } while (htmlElement);
            li = li.length > 0
                ? li[0]
                : null;
            if (li && li.tokeninput) {
                toggle_select_token(li);
            } else {
                // Deselect selected token
                if (selected_token) {
                    deselect_token(selected_token, POSITION.END);
                }

                // Focus input box
                focusWithTimeout(input_box);
            }
        });
        token_list.addEventListener("mouseover", function (event) {
            var li = [];
            var htmlElement = event.target;
            do {
                if (htmlElement.matches && htmlElement.matches("li")) {
                    li.push(htmlElement);
                }
                htmlElement = htmlElement.parentNode;
            } while (htmlElement);
            li = li.length > 0
                ? li[0]
                : null;
            if (li && selected_token !== this) {
                li.classList.add(input.tokenInputsettings.classes.highlightedToken);
            }
        });
        token_list.addEventListener("mouseout", function (event) {
            var li = [];
            var htmlElement = event.target;
            do {
                if (htmlElement.matches && htmlElement.matches("li")) {
                    li.push(htmlElement);
                }
                htmlElement = htmlElement.parentNode;
            } while (htmlElement);
            li = li.length > 0
                ? li[0]
                : null;
            if (li && selected_token !== this) {
                li.classList.remove(input.tokenInputsettings.classes.highlightedToken);
            }
        });

        // Pre-populate list if items exist
        hiddenInput.value = "";
        var li_data = input.tokenInputsettings.prePopulate || hiddenInput.getAttribute("data-pre") || "[]";
        li_data = JSON.parse(li_data);

        if (input.tokenInputsettings.processPrePopulate && typeof(input.tokenInputsettings.onResult) === "function") {
            li_data = input.tokenInputsettings.onResult.call(hiddenInput, li_data);
        }

        if (li_data && li_data.length) {
            li_data.forEach(function (value) {
                insert_token(value);
                checkTokenLimit();
                input_box.removeAttribute("placeholder");
            });
        }

        // Check if widget should initialize as disabled
        if (input.tokenInputsettings.disabled) {
            toggleDisabled(true);
        }

        // Initialization is done
        if (typeof(input.tokenInputsettings.onReady) === "function") {
            input.tokenInputsettings.onReady.call();
        }

        //
        // Public functions
        //
        this.clear = function () {
            [].forEach.call(token_list.querySelectorAll(":scope>li"), function (itemLi) {
                if (itemLi.querySelectorAll(":scope>input").length === 0) {
                    delete_token(itemLi);
                }
            });
        };

        this.add = function (item) {
            add_token(item);
        };

        this.remove = function (item) {
            [].forEach.call(token_list.querySelectorAll(":scope>li"), function (itemLi) {
                if (itemLi.querySelectorAll(":scope>input").length === 0) {
                    var currToken = itemLi.tokeninput;
                    var match = true;
                    Object.keys(item).forEach(function (prop) {
                        if (item[prop] !== currToken[prop]) {
                            match = false;
                            return false;
                        }
                    });
                    if (match) {
                        delete_token(itemLi);
                    }
                }
            });
        };

        this.getTokens = function () {
            return saved_tokens;
        };

        this.toggleDisabled = function (disable) {
            toggleDisabled(disable);
        };

        // Resize input to maximum width so the placeholder can be seen
        resize_input();
    };

    return function (input, url_or_data_or_function, options) {
        var settings = {};

        options = options || {};
        Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
            settings[key] = DEFAULT_SETTINGS[key];
        });
        Object.keys(options).forEach(function (key) {
            settings[key] = options[key];
        });

        input.tokenInputsettings = settings;
        input.tokenInputObject = new TokenList(input, url_or_data_or_function, settings);

        this.clear = function () {
            input.tokenInputObject.clear();
            return this;
        };
        this.add = function (item) {
            input.tokenInputObject.add(item);
            return this;
        };
        this.remove = function (item) {
            input.tokenInputObject.remove(item);
            return this;
        };
        this.get = function () {
            return input.tokenInputObject.getTokens();
        };
        this.toggleDisabled = function (disable) {
            input.tokenInputObject.toggleDisabled(disable);
            return this;
        };
        this.setOptions = function (options) {
            var allSettings = {};
            options = options || {};
            Object.keys(input.tokenInputsettings).forEach(function (key) {
                allSettings[key] = input.tokenInputsettings[key];
            });
            Object.keys(options).forEach(function (key) {
                allSettings[key] = options[key];
            });
            input.tokenInputsettings = allSettings;
            return this;
        };
        this.destroy = function () {
            if (input.tokenInputObject) {
                input.tokenInputObject.clear();
                if (input.previousElementSibling && input.previousElementSibling.tagName === "UL" && input.previousElementSibling.className.indexOf("token-input") > -1) {
                    input.parentNode.removeChild(input.previousElementSibling);
                }
                input.style.display = "";
                return input;
            }
        };
    };

}));
