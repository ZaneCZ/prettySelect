//Copyright (c) 2016 ZaneCZ
//Developed by ZaneCZ under MIT licence
//v0.8

(function ($) {
    $.fn.prettySelect = function (options) {
        var defaultTemplate = '<div class="WRAPPER"><div class="OPTIONS"></div><div class="SEARCHLIST"></div><div class="SEARCHWRAP"><input class="SEARCH"><span class="glyphicon glyphicon-search"></span></div></div>';

        var settings = {
            action: "create",
            template: defaultTemplate,
            wrapperTemplate: "<div class='form-control'>",
            labelTemplate: "<span class='label label-primary'><div class='CONTENT'></div><span class='REMOVE'></span></div>",
            labelContent: labelContent,
            listTemplate: "<div>",
            listItemTemplate: "<div><div class='CONTENT'></div></div>",
            listItemContent: listItemContent,
            itemRemoveTemplate: "<span class='close'>&times;</span>",
            optionsHandler: null,
            listFilterHandler: filterList,
            customSearch: false,
            searchEnabled: true,
            searchDebounce: 150,
            allowDeselect: false,
            showAll: false
        };

        if (typeof options == 'object')
        {
            settings = $.extend(settings, options);
        } else {
            settings.action = options;
        }

        var optionsList = function (prettySelect) {
            this.prettySelect = prettySelect;
            this.selected = [];
            this.template = $("<div class='selectOptions'>");
            this.labelTemplate = settings.labelTemplate;


            if (prettySelect.allowDisabled || prettySelect.multiple)
            {
                this.template.on("click", ".selectLabel .selectRemove", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this).closest(".selectLabel"));
                });

                this.template.on("dblclick", ".selectLabel.selected", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this));
                });
            }

            if ((!prettySelect.multiple && prettySelect.allowDeselect) || (prettySelect.multiple && !prettySelect.searchEnabled))
            {
                this.template.on("click", ".selectLabel.selected", function (e) {
                    e.preventDefault();
                    prettySelect.unselect($(this));
                });
            }

            this.template.on("click", ".selectLabel.unselected", function (e) {
                e.preventDefault()
                prettySelect.selectItem($(this));
            });

            return this;
        };

        optionsList.prototype.render = function () {
            var prettySelect = this.prettySelect;
            var values = prettySelect.values;
            var selected = prettySelect.selected;
            prettySelect.loading(true);
            var labels = $();
            for (var value in values)
            {
                var isSelected = ($.inArray(value, selected) != -1);
                var label = this.label(value);
                if (prettySelect.showAll || !prettySelect.searchEnabled)
                {
                    if (isSelected)
                    {
                        label.addClass('selected');
                    } else {
                        label.addClass('unselected');
                    }
                } else {
                    if (!isSelected)
                    {
                        continue;
                    }
                    label.addClass('selected');
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
            this.template.append(labels);
            prettySelect.loading(false);
        };

        optionsList.prototype.label = function (value) {
            var prettySelect = this.prettySelect;
            var label = $(this.labelTemplate);
            label.addClass('selectLabel').attr('id', 's' + value).val(value);
            var option = prettySelect.values[value];
            var content = settings.labelContent(option);
            var replace = $(".CONTENT", label);
            if (replace.length == 0)
            {
                label.html(content);
            } else {
                replace.replaceWith(content);
            }

            if (((prettySelect.multiple && !prettySelect.showAll) ||
                    (!prettySelect.multiple && prettySelect.allowDeselect)) && prettySelect.searchEnabled)
            {
                label.append($(settings.itemRemoveTemplate).addClass("selectRemove"));
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
            this.template = $(settings.listTemplate);
            this.itemTemplate = settings.listItemTemplate;

            var self = this;

            var lastClicked = null;
            var shiftSelected = $();

            this.template.on("click", ".selectListItem:not(.selected)", function (e) {
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
                        self.template.children(".selectListItem.selected").removeClass("selected");
                        prettySelect.selectItem($(this));
                    }
                }
            });

            this.template.on("click", ".selectListItem.selected", function (e) {
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

        searchList.prototype.fillList = function (values, search) {
            var prettySelect = this.prettySelect;
            var template = this.template;
            var valuesTemp = prettySelect.values;
            for (var attrname in values) {
                valuesTemp[attrname] = values[attrname];
            }
            values = valuesTemp;
            template.html("<div class='noItems'>No more items</div>");
            var selected = prettySelect.selected;
            var items = $();
            for (var value in values)
            {
                var content = values[value];
                var matches = this.filter(search, content);
                if (matches)
                {
                    var item = this.listItem(value);
                    var isSelected = ($.inArray(value.toString(), selected) != -1);
                    if (isSelected)
                    {
                        item.addClass("selected");
                    }
                    items = items.add(item);
                }
            }
            $(template).append(items);
        };

        searchList.prototype.listItem = function (value) {
            var item = $(this.itemTemplate);
            item.addClass("selectListItem");
            item.attr("id", "i" + value);
            item.val(value);
            var option = this.prettySelect.values[value];
            var content = settings.listItemContent(option);
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
            this.selected = [];
            this.optionsHandler = settings.optionsHandler;

            this.searchEnabled = settings.searchEnabled;
            this.showAll = settings.showAll;
            this.allowDeselect = settings.allowDeselect;

            this.element = $("<div class='prettySelect'>");
            this.template = $(settings.template);
            this.wrapper = $(settings.wrapperTemplate);
            this.optionsList = new optionsList(this);
            this.searchWrap = new searchWrap(this);
            this.searchList = new searchList(this);

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

        prettySelect.prototype.addOptions = function (options) {
            var optionsTemp = {};
            var max = 1;
            var values = this.values;
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
                        } else if (typeof json.value !== 'undefined') {
                            optionsTemp[json.value] = json;
                        } else {
                            do {
                                if (typeof values[max] !== 'undefined')
                                {
                                    max++;
                                } else {
                                    optionsTemp[max] = json;
                                    max++;
                                }
                            } while (true);
                        }
                    } else {
                        do {
                            if (typeof values[max] !== 'undefined')
                            {
                                max++;
                            } else {
                                optionsTemp[max] = options[i];
                                max++;
                            }
                        } while (true);
                    }
                }
            } else if (options !== null && typeof options === 'object') {
                optionsTemp = options;
            } else {
                do {
                    if (typeof values[max] !== 'undefined')
                    {
                        max++;
                    } else {
                        optionsTemp[max] = options;
                        max++;
                    }
                } while (true);
            }
            $.extend(values, optionsTemp);
        };

        prettySelect.prototype.select = function (selected) {
            var parent = this.selectBox;
            var values = this.values;
            if (Object.prototype.toString.call(selected) !== '[object Array]')
            {
                selected = [selected];
            }
            if(this.multiple)
            {
                selected = $(selected).not(this.selected).get();
                this.selected = this.selected.concat(selected);
            }else{
                this.selected = selected;
            }

            var search = this.searchEnabled;
            var optionsList = this.optionsList;
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
                    if (search)
                    {
                        $(".selectLabel", optionsList.template).remove();
                    } else {
                        $(".selectLabel#s" + value, optionsList.template).removeClass("selected");
                    }
                }
                optionsList.template.append(label);
                if ($("option[value='" + value + "']", parent).length == 0)
                {
                    var option = $("<option selected>");
                    var content = JSON.stringify(values[value]);
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

        prettySelect.prototype.unselect = function (items) {
            var parent = this.selectBox;
            var self = this;
            var changeState = $();
            $(items).each(function () {
                var value = $(this).val();
                var pos = $.inArray(value.toString(), self.selected);
                if (pos != -1)
                {
                    self.selected.splice(pos, 1);
                }
                $('option[value="' + value + '"]', parent).prop("selected", false);
                var label = self.optionsList.template.children('.selectLabel#s' + value);
                var searchItem = self.searchList.template.children('.selectListItem#i' + value);
                changeState = changeState.add(label).add(searchItem);
                if (self.searchEnabled)
                {
                    label.remove();
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
                var text = self.values[value];
                self.values[value] = text;
                if (self.searchEnabled)
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
        };

        prettySelect.prototype.render = function () {
            var template = $("<div>").html($(this.template));
            var el = this.element;

            var tempWrapper = $(".WRAPPER", template);
            var wrapper = this.wrapper;
            wrapper.addClass("selectWrapper");
            wrapper.html(tempWrapper.html());
            tempWrapper.replaceWith(wrapper);

            var tempOptions = $(".OPTIONS", template);
            var options = this.optionsList.template;
            options.html(tempOptions.html());
            tempOptions.replaceWith(options);

            if (this.searchEnabled)
            {
                var tempSearchList = $(".SEARCHLIST", template);
                var searchList = this.searchList.template;
                searchList.addClass("selectList");
                searchList.html(tempSearchList.children());
                tempSearchList.replaceWith(searchList);

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

                var prettySelect = this;

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

            $(el).html("");
            $(el).append(template.children());
            $(el).insertAfter(this.selectBox);

            if (this.multiple)
            {
                el.addClass("multiple");
            } else {
                el.addClass("simple");
            }
        };

        function filterList(search, text)
        {
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

                        var options = $("option", this);
                        var values = {};
                        var selected = [];
                        options.each(function () {
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
                                values[val] = text;
                            }
                        });
                        object.addOptions(values);
                        object.select(selected);

                        if (settings.optionsHandler != null && !settings.searchEnabled)
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
