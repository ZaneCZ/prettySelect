//Copyright (c) 2016 ZaneCZ
//Developed by ZaneCZ under MIT licence
//v0.9.1

(function ($) {
    $.propHooks.disabled = {
        set: function (el, value) {
            if (value)
            {
                $(el).triggerHandler('disabled');
            } else {
                $(el).triggerHandler('enabled');
            }
        }
    }

    $.fn.prettySelect = function (options) {
        var defaultTemplate = '<div class="WRAPPER form-control">\
    <div class="OPTIONS">\
        <div class="OPTGROUP">\
            <span class="LABEL label label-primary">\
                <span class="CONTENT"></span>\
                <span class="close REMOVE">&times;</span>\
            </span>\
        </div>\
    </div>\
    <div class="SEARCHLIST">\
        <div class="OPTGROUP">\
            <div class="CONTENT"></div>\
        </div>\
    </div>\
    <div class="SEARCHWRAP">\
        <input class="SEARCH">\
        <span class="glyphicon glyphicon-search"></span>\
    </div>\
</div>';

        var settings = {
            action: "create",
            template: defaultTemplate,
            labelContent: labelContent,
            listItemContent: listItemContent,
            listFilterHandler: filterList,
            optionsHandler: null,
            customSearch: false,
            searchEnabled: true,
            searchDebounce: 150,
            allowDeselect: false,
            showAll: false,
            addItemForm: null,
            addItemHandler: null
        };

        if (typeof options == 'object')
        {
            settings = $.extend(settings, options);
        } else {
            settings.action = options;
        }

        var addButton = function (select) {
            this.prettySelect = select;
            var tmp = select.element;


            this.handler = settings.addHandler;
        };

        var optGroup = function (select, id, title) {
            this.prettySelect = select;
            this.id = id;
            this.parent = null;
            this.title = title;
            this.values = {};

            return this;
        };

        optGroup.prototype.setParent = function (parent) {
            this.parent = parent;
        };

        optGroup.prototype.renderOption = function () {
            var optionsList = this.prettySelect.optionsList;
            var el = $(optionsList.groupTemplate).attr("id", "GROUP" + this.id);
            el.prepend($("<span class='groupLabel'>").text(this.title));
            return el;
        };

        optGroup.prototype.renderList = function () {
            var searchList = this.prettySelect.searchList;
            var el = $(searchList.groupTemplate);
            el.prepend($("<span class='groupLabel'>").text(this.title));
            return el;
        };

        var optionData = function (value, content, group) {
            this.value = value;
            this.content = content;
            this.group = group;

            return this;
        };

        var optionsList = function (prettySelect) {
            this.prettySelect = prettySelect;
            this.selected = [];

            var psTemplate = prettySelect.element;
            this.template = $(".OPTIONS", psTemplate).addClass("selectOptions").removeClass("OPTIONS");
            var group = $(".OPTGROUP", this.template).clone().addClass("selectGroup").removeClass("OPTGROUP");
            if (group.length !== 0)
            {
                var label = $(".LABEL", group);
                label.replaceWith("<div class='groupItems'>");
                this.groupTemplate = $('<div>').append(group).html();
                this.labelTemplate = $('<div>').append($(".LABEL", this.template).clone().removeClass("LABEL")).html();
            } else {
                this.labelTemplate = this.template.html();
            }
            this.template.html("");

            if (prettySelect.allowDeselect || prettySelect.multiple)
            {
                this.template.on("click", ".selectLabel:not(.disabled) .selectRemove", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this).closest(".selectLabel"));
                });

                this.template.on("dblclick", ".selectLabel.selected:not(.disabled)", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this));
                });
            }

            if (((!prettySelect.multiple && prettySelect.allowDeselect) || (prettySelect.multiple)) && (!prettySelect.searchEnabled || prettySelect.showAll))
            {
                this.template.on("click", ".selectLabel.selected:not(.disabled)", function (e) {
                    e.preventDefault();
                    prettySelect.unselect($(this));
                });
            }

            this.template.on("click", ".selectLabel.unselected:not(.disabled)", function (e) {
                e.preventDefault()
                prettySelect.selectItem($(this));
            });

            var select = prettySelect.selectBox;
            $("option", select).on("disabled", function (e) {
                prettySelect.disableOption(this);
                e.stopPropagation();
            });
            $("option", select).on("enabled", function (e) {
                prettySelect.enableOption(this);
                e.stopPropagation();
            });

            return this;
        };

        optionsList.prototype.render = function (group) {
            var prettySelect = this.prettySelect;
            if (typeof group == 'undefined')
            {
                var values = prettySelect.values;
                prettySelect.loading(true);
            } else {
                var values = group.values;
            }
            var selected = prettySelect.selected;
            var disabled = prettySelect.disabled;
            var labels = $();
            var groups = $();
            for (var value in values)
            {
                if (values[value] instanceof optGroup)
                {
                    groups = groups.add(this.render(values[value]));
                    var empty = false;
                } else {
                    var isSelected = ($.inArray(value, selected) != -1);
                    var isDisabled = ($.inArray(value, disabled) != -1);
                    var label = this.label(value);
                    var empty = true;
                    if (prettySelect.showAll || !prettySelect.searchEnabled)
                    {
                        if (isSelected)
                        {
                            label.addClass('selected');
                        } else {
                            label.addClass('unselected');
                        }
                        if (isDisabled)
                        {
                            label.addClass('disabled');
                        }
                        empty = false;
                    } else {
                        if (!isSelected)
                        {
                            continue;
                        }
                        label.addClass('selected');
                        empty = false;
                    }

                    if (!(((prettySelect.multiple && !prettySelect.showAll) ||
                            (!prettySelect.multiple && prettySelect.allowDeselect)) && prettySelect.searchEnabled))
                    {
                        if (prettySelect.searchEnabled)
                        {
                            $(".selectLabel", this.template).remove();
                        } else {
                            $(".selectLabel#s" + value, this.template).removeClass("selected");
                        }
                    }
                    labels = labels.add(label);
                }
            }
            if (typeof group == 'undefined')
            {
                this.template.append(groups);
                this.template.append(labels);
                prettySelect.loading(false);
            } else {
                if ((prettySelect.multiple || prettySelect.showAll || !prettySelect.searchEnabled) && !empty)
                {
                    var el = group.renderOption();
                    $(el).append(groups);
                    $(".groupItems", el).append(labels);
                    return el;
                } else {
                    return labels;
                }
            }
        };

        optionsList.prototype.label = function (value) {
            var prettySelect = this.prettySelect;
            var label = $(this.labelTemplate);
            label.addClass('selectLabel').attr('id', 's' + value).val(value);

            var remove = $(".REMOVE", label);
            if (((prettySelect.multiple && !prettySelect.showAll) ||
                    (!prettySelect.multiple && prettySelect.allowDeselect && !prettySelect.showAll)) && prettySelect.searchEnabled)
            {
                remove.removeClass("REMOVE").addClass("selectRemove");
            } else {
                remove.remove();
            }

            var option = prettySelect.optionsData[value];
            var content = settings.labelContent(option.content);
            var replace = $(".CONTENT", label);
            if (replace.length == 0)
            {
                label.prepend(content);
            } else {
                replace.replaceWith(content);
            }

            return label;
        };

        var searchWrap = function (prettySelect) {
            this.prettySelect = prettySelect;
            var input = $("<input type='text' class='selectSearch' value=''>");
            this.searchbar = input;

            var self = this;

            $(input).on("keyup", function () {
                self.searchKeyUp(this);
            });

            $(input).on("focus", function () {
                var el = prettySelect.element;
                if (!el.hasClass("focused"))
                {
                    self.setPlaceholder();
                    el.addClass("focused");
                }
            });
            $(prettySelect.selectBox).on("focus", function (e) {
                e.preventDefault();
                self.searchbar.focus();
            });

            this.value = "";
            this.lastState = "";

            return this;
        };

        searchWrap.prototype.searchKeyUp = function () {
            var searchbar = this.searchbar;
            var value = searchbar.val();
            var list = this.prettySelect.searchList;
            if (value != this.lastState)
            {
                var debounce = settings.searchDebounce;
                if (debounce > 300)
                {
                    list.loading(true);
                }
                this.lastState = value;
                if (typeof this.timeout != 'undefined')
                {
                    clearTimeout(this.timeout);
                }
                var wrap = this;
                this.timeout = setTimeout(function () {
                    if (searchbar.val() == value)
                    {
                        wrap.searchValues(value);
                    }
                }, debounce);
            }
        };

        searchWrap.prototype.searchValues = function (search) {
            if (typeof search == "undefined")
            {
                search = this.searchbar.val();
            }
            var prettySelect = this.prettySelect;
            var list = prettySelect.searchList;
            var optionsHandler = prettySelect.optionsHandler;
            var values = prettySelect.values;

            if (optionsHandler == null)
            {
                list.fillList(values, search);
                list.loading(false);
            } else {
                list.loading(true);
                $.when(optionsHandler(search)).then(function (response) {
                    list.fillList(response, search);
                    list.loading(false);
                });
            }
        };

        searchWrap.prototype.setPlaceholder = function (text) {
            if (typeof text === 'undefined')
            {
                text = this.prettySelect.placeholder;
            }
            this.searchbar.prop("placeholder", text);
        };

        var searchList = function (prettySelect) {
            this.prettySelect = prettySelect;

            var psTemplate = prettySelect.element;
            this.template = $(".SEARCHLIST", psTemplate);
            var group = $(".OPTGROUP", this.template).clone().addClass("selectGroup").removeClass("OPTGROUP");
            if (group.length !== 0)
            {
                var item = $(".CONTENT", group);
                item.replaceWith("<div class='groupItems'>");
                this.groupTemplate = $('<div>').append(group).html();
            }
            this.itemTemplate = $('<div>').append($('.CONTENT', this.template).clone().removeClass("CONTENT")).html();
            this.template.html("");

            var self = this;

            var lastClicked = null;
            var shiftSelected = $();

            this.template.on("click", ".selectListItem:not(.selected, .disabled)", function (e) {
                if (prettySelect.multiple)
                {
                    var newSelected = $(this);
                    if (e.shiftKey && lastClicked !== null)
                    {
                        if ($(lastClicked).prevAll().filter($(this)).length !== 0)
                        {
                            newSelected = newSelected.add($(lastClicked).prevUntil($(this)));
                        } else {
                            newSelected = newSelected.add($(lastClicked).nextUntil($(this)));
                        }
                        newSelected = newSelected.add($(lastClicked));
                        prettySelect.unselect(shiftSelected.not(newSelected));
                    } else {
                        lastClicked = this;
                    }
                    prettySelect.selectItem(newSelected);
                    shiftSelected = newSelected;
                } else {
                    lastClicked = this;
                    if (this != lastClicked)
                    {
                        shiftSelected = $();
                    }
                    if (!$(this).hasClass("selected"))
                    {
                        $(".selectListItem.selected", self.template).removeClass("selected");
                        prettySelect.selectItem($(this));
                    }
                }
            });

            this.template.on("click", ".selectListItem.selected:not(.disabled)", function (e) {
                if (!e.shiftKey || lastClicked === null)
                {
                    lastClicked = this;
                    if (prettySelect.multiple || prettySelect.allowDeselect)
                    {
                        prettySelect.unselect($(this));
                        $(this).removeClass("selected");
                    }
                }
            });

            return this;
        };

        searchList.prototype.loading = function (is) {
            var el = this.template;
            if (is)
            {
                el.addClass("loading");
            } else {
                el.removeClass("loading");
            }
        };

        searchList.prototype.filter = settings.listFilterHandler;

        searchList.prototype.fillList = function (values, search, group) {
            var prettySelect = this.prettySelect;
            var disabled = prettySelect.disabled;
            var template = this.template;
            if (typeof group == 'undefined')
            {
                var valuesTemp = prettySelect.values;
                for (var attrname in values) {
                    valuesTemp[attrname] = values[attrname];
                }
                values = valuesTemp;
                template.html("<div class='noItems'>No more items</div>");
            } else {
                values = group.values;
            }
            var selected = prettySelect.selected;
            var items = $();
            for (var value in values)
            {
                if (values[value] instanceof optGroup)
                {
                    var item = this.fillList(values, search, values[value]);
                    items = items.add(item);
                } else {
                    var content = values[value];
                    var matches = this.filter(search, content);
                    if (matches)
                    {
                        var item = this.listItem(value);
                        var isSelected = ($.inArray(value.toString(), selected) != -1);
                        var isDisabled = ($.inArray(value, disabled) != -1 || (typeof content.disabled !== 'undefined' && content.disabled == true));
                        if (isSelected)
                        {
                            item.addClass("selected");
                        }
                        if (isDisabled)
                        {
                            item.addClass("disabled");
                        }
                        items = items.add(item);
                    }
                }
            }
            if (typeof group == 'undefined')
            {
                $(template).append(items);
            } else {
                var el = group.renderList();
                $(".groupItems", el).append(items);
                return el;
            }
        };

        searchList.prototype.listItem = function (value) {
            var item = $(this.itemTemplate);
            item.addClass("selectListItem").removeClass("CONTENT");
            item.attr("id", "i" + value);
            item.val(value);
            var option = this.prettySelect.optionsData[value];
            var content = settings.listItemContent(option.content);
            var replace = $(".CONTENT", item);
            if (replace.length == 0)
            {
                item.html(content);
            } else {
                replace.replaceWith(content);
            }
            return item;
        };

        var prettySelect = function (select) {
            select.psData = this;
            this.selectBox = $(select);
            this.selectBox.css("display", "none");

            this.multiple = (typeof this.selectBox.attr("multiple") != "undefined");
            this.placeholder = "search";
            this.values = {};
            this.optionsData = {};
            this.selected = [];
            this.disabled = [];
            this.optionsHandler = settings.optionsHandler;

            this.searchEnabled = settings.searchEnabled;
            this.showAll = settings.showAll;
            this.allowDeselect = settings.allowDeselect;

            this.element = $("<div class='prettySelect'>").html(settings.template);
            this.wrapper = $(".WRAPPER", this.element).addClass("selectWrapper").removeClass("WRAPPER");
            this.optionsList = new optionsList(this);
            this.searchWrap = new searchWrap(this);
            this.addButton = new addButton(this);
            this.searchList = new searchList(this);

            var self = this;
            $(select).on("disabled", function () {
                self.element.addClass("disabled");
            });
            $(select).on("enabled", function () {
                self.element.removeClass("disabled");
            });

            this.element.on("click", function (e) {
                if ($(select).is(":disabled"))
                {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();
                }
            });

            return this;
        };

        prettySelect.prototype.loading = function (is) {
            var el = this.element;
            if (is)
            {
                el.addClass("loading");
            } else {
                el.removeClass("loading");
            }
        };

        function addOptions(options) {
            var optionsTemp = {};
            var optionsTempData = {};
            var max = 1;
            var values = this.values;
            var data = this.optionsData;
            if (options.constructor === Array)
            {
                var isJson = true;
                try {
                    JSON.parse(options[0])
                } catch (e) {
                    isJson = false;
                }
                for (var i = 0; i < options.length; i++)
                {
                    if (isJson)
                    {
                        var json = JSON.parse(options[i]);
                        if (typeof json.id !== 'undefined')
                        {
                            optionsTemp[json.id] = json;
                            optionsTempData[json.id] = new optionData(json.id, json);
                        } else if (typeof json.value !== 'undefined') {
                            optionsTemp[json.value] = json;
                            optionsTempData[json.value] = new optionData(json.value, json);
                        } else {
                            do {
                                if (typeof data[max] !== 'undefined')
                                {
                                    max++;
                                } else {
                                    optionsTemp[max] = json;
                                    optionsTempData[max] = new optionData(max, json);
                                    max++;
                                }
                            } while (true);
                        }
                    } else {
                        do {
                            if (typeof data[max] !== 'undefined')
                            {
                                max++;
                            } else {
                                optionsTemp[max] = options[i];
                                optionsTempData[max] = new optionData(max, options[i]);
                                max++;
                            }
                        } while (true);
                    }
                }
            } else if (options !== null && typeof options === 'object') {
                for (var val in options)
                {
                    optionsTemp[val] = options[val];
                    optionsTempData[val] = new optionData(val, options[val]);
                }
            } else {
                do {
                    if (typeof values[max] !== 'undefined')
                    {
                        max++;
                    } else {
                        optionsTemp[max] = options;
                        optionsTempData[max] = new optionData(max, options);
                        max++;
                    }
                } while (true);
            }
            $.extend(values, optionsTemp);
            $.extend(data, optionsTempData);
        }
        ;

        optGroup.prototype.addOptions = addOptions;
        prettySelect.prototype.addOptions = addOptions;

        function addGroup(group) {
            var values = this.values;
            if (typeof group.id == 'undefined')
            {
                var max = 1;
                do {
                    if (typeof values["GROUP" + max] !== 'undefined')
                    {
                        max++;
                    } else {
                        group.id = max;
                        values["GROUP" + max] = group;
                        max++;
                    }
                } while (true);
            } else {
                values["GROUP" + group.id] = group;
            }
        }
        ;

        optGroup.prototype.addGroup = addGroup;
        prettySelect.prototype.addGroup = addGroup;

        function renderGroupTree(group, wrap)
        {
            var tmp = wrap;
            if (group.parent !== null)
            {
                var tmp = $(".selectGroup#GROUP" + group.parent.id, wrap);
                if (tmp.length == 0)
                {
                    tmp = renderGroupTree(group.parent, wrap);
                    wrap.append(tmp);
                }
            }
            var groupEl = $(".selectGroup#GROUP" + group.id, tmp);
            if (groupEl.length == 0)
            {
                var el = group.renderOption();
                tmp.append(el)
                groupEl = el;
            }
            return groupEl;
        }

        prettySelect.prototype.select = function (selected) {
            var parent = this.selectBox;
            var values = this.values;
            var data = this.optionsData;
            if (Object.prototype.toString.call(selected) !== '[object Array]')
            {
                selected = [selected];
            }
            if (this.multiple)
            {
                selected = $(selected).not(this.selected).get();
                this.selected = this.selected.concat(selected);
            } else {
                this.selected = selected;
            }

            var search = this.searchEnabled;
            var optionsList = this.optionsList;
            var searchList = this.searchList;
            for (var i = 0; i < selected.length; i++)
            {
                var value = selected[i];
                var label = optionsList.label(value);
                label.addClass('selected');
                if (((this.multiple && !this.showAll) ||
                        (!this.multiple && this.allowDeselect)) && this.searchEnabled)
                {
                    this.searchWrap.setPlaceholder();
                }
                if (!this.multiple)
                {
                    if (search && !this.showAll)
                    {
                        $(".selectLabel", optionsList.template).remove();
                    }
                    $(".selectLabel.selected", optionsList.template).removeClass("selected").addClass("unselected");
                    $(".selectListItem.selected", searchList.template).removeClass("selected");
                }
                $(".selectListItem#i" + value, searchList.template).addClass("selected");
                var group = data[value].group;
                var tmp = optionsList.template;
                var exists = ($('.selectLabel#s' + value, optionsList.template).length !== 0);
                if (exists)
                {
                    $(".selectLabel#s" + value, optionsList.template).removeClass("unselected").addClass("selected");
                }else{
                    if (typeof group !== 'undefined' && this.multiple)
                    {
                        var groupEl = renderGroupTree(group, tmp);
                        $("> .groupItems", groupEl).append(label);
                    } else {
                        tmp.append(label);
                    }
                }
                if ($("option[value='" + value + "']", parent).length == 0)
                {
                    var option = $("<option selected>");
                    var content = JSON.stringify(option.content);
                    option.val(value).text(content);
                    $(parent).append(option);
                }
                if (this.multiple)
                {
                    $("option[value='" + value + "']", parent).prop("selected", true);
                } else {
                    parent.val(value);
                }
            }
        };

        function destroyGroupTree(group, wrap)
        {
            if (typeof group !== 'undefined')
            {
                var children = $(".selectLabel, .selectGroup", wrap);
                var parent = wrap.parent().closest(".selectGroup");
                if (children.length == 0)
                {
                    wrap.remove()
                }
                if (group.parent !== null)
                {
                    destroyGroupTree(group.parent, parent);
                }
            }
        }

        prettySelect.prototype.unselect = function (items) {
            var parent = this.selectBox;
            var self = this;
            var changeState = $();
            var data = this.optionsData;
            $(items).each(function () {
                var value = $(this).val();
                var pos = $.inArray(value.toString(), self.selected);
                if (pos != -1)
                {
                    self.selected.splice(pos, 1);
                }
                $('option[value="' + value + '"]', parent).prop("selected", false);
                var label = $('.selectLabel#s' + value, self.optionsList.template);
                var searchItem = $('.selectListItem#i' + value, self.searchList.template);
                changeState = changeState.add(label).add(searchItem);
                if (self.searchEnabled && !self.showAll)
                {
                    var gr = data[value].group;
                    var wrap = label.closest(".selectGroup");
                    label.remove();
                    destroyGroupTree(gr, wrap);
                } else {
                    label.removeClass("selected").addClass("unselected");
                }
                if (!self.multiple)
                {
                    parent.val(null);
                }
            });
            $(changeState).removeClass("selected").addClass("unselected");
            parent.trigger("change");
        };

        prettySelect.prototype.selectItem = function (items) {
            var parent = this.selectBox;
            var self = this;
            $(items).each(function () {
                var value = $(this).val();
                if (self.searchEnabled || self.showAll)
                {
                    self.select(value);
                } else {
                    if (self.multiple)
                    {
                        $("option[value='" + value + "']", parent).prop("selected", true);
                    } else {
                        $(".selectLabel.selected", self.optionsList.template).removeClass("selected").addClass("unselected");
                        parent.val(value);
                    }
                }
            });
            $(items).removeClass("unselected").addClass("selected");
            parent.trigger("change");
            parent.trigger("select");
        };

        prettySelect.prototype.disableOption = function (option) {
            var value = $(option).val();
            var pos = $.inArray(value.toString(), this.disabled);
            if (pos == -1)
            {
                $(".selectLabel#s" + value, this.optionsList.template).addClass("disabled");
                $(".selectListItem#i" + value, this.searchList.template).addClass("disabled");
                this.disabled.push(value);//.splice(pos, 1);
            }
        };

        prettySelect.prototype.enableOption = function (option) {
            var value = $(option).val();
            var pos = $.inArray(value.toString(), this.disabled);
            if (pos != -1)
            {
                $(".selectLabel#s" + value, this.optionsList.template).removeClass("disabled");
                $(".selectListItem#i" + value, this.searchList.template).removeClass("disabled");
                this.disabled.splice(pos, 1);
            }
        };

        prettySelect.prototype.render = function () {
            var template = this.element;

            var el = this.element;

            if (this.searchEnabled)
            {
                var searchList = $(".SEARCHLIST", template);
                searchList.addClass("selectList").removeClass("SEARCHLIST");

                var tempSearchWrap = $(".SEARCHWRAP", template);
                var searchWrap;
                if (settings.customSearch)
                {
                    searchWrap = $("<div>");
                } else {
                    searchWrap = $(this.optionsList.labelTemplate);
                }
                searchWrap.addClass("searchWrap");
                searchWrap.html(tempSearchWrap.children());
                tempSearchWrap.replaceWith(searchWrap);

                var tempSearchbar = $(".SEARCH", template);
                var input = this.searchWrap.searchbar;
                input.prop("placeholder", this.placeholder);
                tempSearchbar.replaceWith(input);

                this.searchWrap.searchValues();

                var stayFocused = false;

                $(el).on("mousedown", function () {
                    stayFocused = true;
                }).on("click", function () {
                    $(".selectSearch", el).focus();
                    stayFocused = false;
                });

                $(el).on("blur", ".selectSearch", function () {
                    if (!stayFocused)
                    {
                        $(el).removeClass("focused");
                    }
                    stayFocused = false;
                });
            } else {
                $(".SEARCHLIST, .SEARCHWRAP, .SEARCH", template).remove();
            }

            $(el).insertAfter(this.selectBox);

            if (this.multiple || this.showAll)
            {
                el.addClass("showAll");
            } else {
                el.addClass("simple");
            }
        };

        function filterList(search, text)
        {
            try {
                text = text.toLowerCase();
                search = search.toLowerCase();
                if (search == "")
                {
                    return true;
                }
                search = search.split(/[\s,]+/);
                var matches = false;
                var len = search.length;
                for (var i = 0; i < len; i++)
                {
                    if (search[i].trim() != "" && text.indexOf(search[i]) != -1)
                    {
                        matches = true;
                        break;
                    }
                }
            } catch (e) {
                return false;
            }
            return matches;
        }

        function labelContent(value) {
            return value;
        }

        function listItemContent(value) {
            return value;
        }

        function exists(item)
        {
            return (typeof item.psData != 'undefined');
        }

        var action = settings.action;
        var existsAny = false;
        this.each(function () {
            if (exists(this))
            {
                existsAny = true;
            }
        });
        if (action == "options" || existsAny)
        {
            var values = [];
            this.each(function () {
                if (exists(this))
                {
                    var object = this.psData;
                    values.push(object.values);
                } else {
                    values.push(null);
                }
            });
            return values;
        } else {
            return this.each(function () {
                switch (action) {
                    case "destroy":
                    {
                        if (exists(this))
                        {
                            var object = this.psData;
                            $(this).css("display", null);
                            $(object.element).remove();
                            delete this.psData;
                            delete object;
                        }
                    }
                    case "create":
                    default:
                    {
                        if (exists(this))
                        {
                            return false;
                        }
                        var object = new prettySelect(this);

                        var options = $("optgroup, > option", this);
                        var values = {};
                        var data = {};
                        var selected = [];
                        var disabled = [];
                        var max = 1;

                        var groups = {};

                        options.each(function () {
                            if ($(this).is("optgroup"))
                            {
                                var id = $(this).data("id");
                                if (typeof id == 'undefined')
                                {
                                    id = max;
                                    max++;
                                }
                                var title = $(this).attr("label");
                                var group = new optGroup(object, id, title);
                                groups[id] = group;
                                var parent = $(this).data("parent");
                                if (typeof parent == 'undefined')
                                {
                                    values["GROUP" + id] = group;
                                } else {
                                    groups[parent].values["GROUP" + id] = group;
                                    group.setParent(groups[parent]);
                                }
                                var opt = {};
                                $("option", this).each(function () {
                                    var val = $(this).val();
                                    var text = $(this).text()
                                    if ($(this).is(":selected"))
                                    {
                                        selected.push(val);
                                    }
                                    if ($(this).is(":disabled"))
                                    {
                                        disabled.push(val);
                                    }
                                    opt[val] = text;
                                    data[val] = new optionData(val, text, group);
                                });
                                group.addOptions(opt);
                            } else {
                                var val = $(this).val();
                                var text = $(this).text()
                                if (val.toString() == "" || val == null)
                                {
                                    object.placeholder = text;
                                } else {
                                    if ($(this).is(":selected"))
                                    {
                                        selected.push(val);
                                    }
                                    if ($(this).is(":disabled"))
                                    {
                                        disabled.push(val);
                                    }
                                    values[val] = text;
                                    data[val] = new optionData(val, text);
                                }
                            }
                        });
                        object.addOptions(values);
                        object.optionsData = data;
                        object.selected = selected;
                        object.disabled = disabled;
                        if ($(this).is(":disabled"))
                        {
                            object.element.addClass("disabled");
                        }

                        if (settings.optionsHandler != null)
                        {
                            object.loading(true);
                            $.when(settings.optionsHandler("")).then(function (response) {
                                object.addOptions(response);
                                object.render();
                                object.optionsList.render();
                                object.loading(false);
                            });
                        } else {
                            object.render();
                            object.optionsList.render();
                        }
                    }
                }
            });
        }
    }
}(jQuery));
