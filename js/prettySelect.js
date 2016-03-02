//Copyright (c) 2016 ZaneCZ
//Developed by ZaneCZ under MIT licence

(function ($) {
    $.fn.prettySelect = function (options) {
        var defaultTemplate = '<div class="WRAPPER"><div class="OPTIONS"></div><div class="SEARCHLIST"></div><div class="SEARCHWRAP"><input class="SEARCH"><span class="glyphicon glyphicon-search"></span></div></div>';

        var settings = {
            action: "create",
            template: defaultTemplate,
            wrapperTemplate: "<div class='form-control'>",
            labelTemplate: "<span class='label label-primary'>",
            listTemplate: "<div>",
            listItemTemplate: "<div>",
            itemRemoveTemplate: "<span>&times;</span>",
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

            
            if(prettySelect.allowDisabled || prettySelect.multiple)
            {
                $(this.template).on("click", ".selectLabel .close", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this).closest(".selectLabel"));
                });
                
                $(this.template).on("dblclick", ".selectLabel.selected", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this));
                });
            }
            
            if ((!prettySelect.multiple && prettySelect.allowDeselect) || (prettySelect.multiple && !prettySelect.searchEnabled))
            {
                $(this.template).on("click", ".selectLabel.selected", function (e) {
                    e.preventDefault()
                    prettySelect.unselect($(this));
                });
            }

            $(this.template).on("click", ".selectLabel.unselected", function (e) {
                e.preventDefault()
                prettySelect.selectItem($(this));
            });

            return this;
        }
        ;

        optionsList.prototype.render = function () {
            var prettySelect = this.prettySelect;
            var values = prettySelect.values;
            var selected = prettySelect.selected;
            prettySelect.loading(true);
            for (var value in values)
            {
                var isSelected = ($.inArray(value, selected) != -1);
                var label = $(this.labelTemplate);
                label.addClass('selectLabel').attr('id', 's' + value).val(value);
                var text = values[value];
                label.text(text);
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

                if (((prettySelect.multiple && !prettySelect.showAll) || 
                        (!prettySelect.multiple && prettySelect.allowDeselect)) && prettySelect.searchEnabled)
                {
                    label.append($(settings.itemRemoveTemplate).addClass("close"));
                } else {
                    if (prettySelect.searchEnabled)
                    {
                        $(".selectLabel", this.template).remove();
                    } else {
                        $(".selectLabel#s" + value, this.template).removeClass("selected");
                    }
                }
                this.template.append(label);
            }
            prettySelect.loading(false);
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
                prettySelect.element.addClass("focused");
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
            this.prettySelect.placeholder = text;
            this.searchbar.prop("placeholder", text);
        };

        var searchList = function (prettySelect) {
            this.prettySelect = prettySelect;
            this.template = $(settings.listTemplate);
            this.itemTemplate = settings.listItemTemplate;

            $(this.template).on("click", ".selectListItem:not(.selected)", function () {
                prettySelect.selectItem($(this));
                if (prettySelect.multiple)
                {
                    $(this).remove();
                } else {
                    $(".selectListItem.selected", this.template).removeClass("selected");
                    $(this).addClass("selected");
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
            var multiple = prettySelect.multiple;
            template.html("<div class='noItems'>No more items</div>");
            var selected = prettySelect.selected;
            for (var value in values)
            {
                var text = values[value];
                var matches = this.filter(search, text);
                var isSelected = ($.inArray(value.toString(), selected) != -1);
                if ((!isSelected || !multiple) && matches)
                {
                    var listItem = $(this.itemTemplate);
                    listItem.addClass("selectListItem");
                    $(listItem).data('value', value);
                    $(listItem).data('text', text);
                    $(listItem).text(text);
                    if (!multiple && value == selected)
                    {
                        $(listItem).addClass("selected");
                    }
                    $(template).append(listItem);
                }
            }
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
            $.extend(this.values, options);
        };

        prettySelect.prototype.select = function (selected) {
            var parent = this.selectBox;
            var values = this.values;
            if (Object.prototype.toString.call(selected) !== '[object Array]')
            {
                selected = [selected];
            }
            this.selected = jQuery.unique(this.selected.concat(selected));

            var search = this.searchEnabled;
            var optionsList = this.optionsList;
            for (var i = 0; i < selected.length; i++)
            {
                var label = $(optionsList.labelTemplate);
                var value = selected[i];
                var text = values[value];
                label.addClass('selectLabel').addClass('selected');
                label.val(value).text(text).attr('id', 's' + value)
                if (((this.multiple && !this.showAll) || 
                        (!this.multiple && this.allowDeselect)) && this.searchEnabled)
                {
                    label.append($(settings.itemRemoveTemplate).addClass("close"));
                    this.searchWrap.setPlaceholder("search");
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
                    option.val(value).text(text);
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

        prettySelect.prototype.unselect = function (item) {
            var parent = this.selectBox;
            var value = item.val();
            var pos = $.inArray(value.toString(), this.selected);
            if (pos != -1)
            {
                this.selected.splice(pos, 1);
            }
            $('option[value="' + value + '"]', parent).prop("selected", false);
            if(!this.multiple)
            {
                parent.val(null);
            }
            if (this.searchEnabled)
            {
                item.remove();
                this.searchWrap.searchValues();
            } else {
                $(item).removeClass("selected").addClass("unselected");
            }
            parent.trigger("change");
        };

        prettySelect.prototype.selectItem = function (item) {
            var parent = this.selectBox;
            var value = $(item).data("value");
            var text = $(item).data("text");
            this.values[value] = text;
            if (this.searchEnabled)
            {
                this.select(value);
            } else {

                if (this.multiple)
                {
                    $("option[value='" + value + "']", parent).prop("selected", true);
                } else {
                    $(".selectLabel.selected", this.optionsList.template).removeClass("selected").addClass("unselected");
                    parent.val(value);
                }
                $(item).removeClass("unselected").addClass("selected");
            }
            if (!this.multiple)
            {
                this.searchWrap.setPlaceholder(text);
            }
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

        function exists(item)
        {
            return (typeof item.psData != 'undefined');
        }

        function getValues(wrapper)
        {
            return wrapper.selectData.values;
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
                            if ($(this).is(":selected"))
                            {
                                selected.push(val);
                                if (!object.multiple)
                                {
                                    object.placeholder = text;
                                }
                            }
                            values[val] = text;
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
