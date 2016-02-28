(function ($) {
    $.fn.prettySelect = function (options) {

        var settings = {
            action: "create",
            wrapperTemplate: "<div class='form-control'>",
            labelTemplate: "<span class='label label-primary'>",
            listTemplate: "<div>",
            listItemTemplate: "<div>",
            itemRemoveTemplate: "<span>&times;</span>",
            valuesHandler: null,
            listFilterHandler: filterList,
            searchEnabled: true,
            searchDebounce: 100
        };
        if (typeof options == 'object')
        {
            settings = $.extend(settings, options);
        } else {
            settings.action = options;
        }

        function render(wrapper, selected)
        {
            if (settings.searchEnabled)
            {
                select(wrapper, selected);
            } else {
                renderNoSearch(wrapper, selected);
            }
        }

        function renderNoSearch(wrapper, selected)
        {
            var data = wrapper.selectData;
            var values = data.values;
            var parent = data.parent;
            for (var value in values)
            {
                var label = $(settings.labelTemplate);
                var text = values[value];
                label.addClass('selectLabel');
                label.val(value).text(text).attr('id', 's' + value);
                label.data("value",value);
                label.data("text",text);
                var isSelected = ($.inArray(value, selected) != -1);
                if (!isSelected)
                {
                    label.addClass("unselected");
                } else {
                    label.addClass("selected");
                }
                if ($("option[value='" + value + "']", parent).length == 0)
                {
                    var option = $("<option>");
                    if(isSelected)
                    {
                        option.attr("selected", true);
                    }else{
                        option.attr("selected", false);
                    }
                    option.val(value).text(text);
                    $(parent).append(option);
                }
                wrapper.append(label);
            }
        }

        function select(wrapper, selected)
        {
            var data = wrapper.selectData;
            var parent = data.parent;
            var values = data.values;
            if (Object.prototype.toString.call(selected) !== '[object Array]')
            {
                selected = [selected];
            }
            var search = data.search;
            for (var i = 0; i < selected.length; i++)
            {
                var label = $(settings.labelTemplate);
                var value = selected[i];
                var text = values[value];
                label.addClass('selectLabel').addClass('selected');
                label.val(value).text(text).attr('id', 's' + value)
                if (data.multiple)
                {
                    label.append($(settings.itemRemoveTemplate).addClass("close"));
                } else {
                    if (search)
                    {
                        $(".selectLabel", wrapper).remove();
                    } else {
                        $(".selectLabel#s" + value, wrapper).removeClass("selected");
                    }
                }
                data.options.append(label);
                if ($("option[value='" + value + "']", parent).length == 0)
                {
                    var option = $("<option selected>");
                    option.val(value).text(text);
                    $(parent).append(option);
                }
                if (data.multiple)
                {
                    $("option[value='" + value + "']", parent).prop("selected", true);
                } else {
                    parent.val(value);
                }
            }
        }

        function unselect(wrapper, item)
        {
            var parent = wrapper.selectData.parent;
            var value = item.val();
            $('option[value="' + value + '"]', parent).prop("selected", false);
            if (settings.searchEnabled)
            {
                item.remove();
                fillList(wrapper);
            } else {
                $(item).removeClass("selected").addClass("unselected");
            }
            parent.trigger("change");
        }

        function searchKeyUp(wrapper)
        {
            var input = wrapper.selectData.search;
            var list = wrapper.selectData.list;
            var text = input.val();
            if (text != input.lastState)
            {
                var debounce = settings.searchDebounce;
                if(debounce > 2500)
                {
                    list.addClass("loading");
                }
                input.lastState = text;
                if (typeof input.timeout != 'undefined')
                {
                    clearTimeout(input.timeout);
                }
                input.timeout = setTimeout(function () {
                    if (input.val() == text)
                    {
                        fillList(wrapper);
                    }
                }, debounce);
            }
        }

        function focusSearch(wrapper)
        {
            var input = wrapper.selectData.search;
            $(input).focus();
        }

        function showList(wrapper)
        {
            var list = wrapper.selectData.list;
            $(list).css('display', 'initial');
            fillList(wrapper);
        }

        function fillList(wrapper)
        {
            var data = wrapper.selectData;
            var list = data.list;
            var input = data.search;
            var search = input.val();
            if (settings.valuesHandler == null)
            {
                fillListFinish(wrapper, data.values);
                list.removeClass("loading");
            } else {
                list.addClass("loading");
                $.when(settings.valuesHandler(wrapper, search)).then(function (response) {
                    fillListFinish(wrapper, response);
                    list.removeClass("loading");
                });
            }
        }

        function fillListFinish(wrapper, values)
        {
            var data = wrapper.selectData;
            var valuesTemp = data.values;
            for (var attrname in values) { valuesTemp[attrname] = values[attrname];}
            values = valuesTemp;
            var multiple = data.multiple;
            var input = data.search;
            var search = input.val();
            var list = data.list;
            $(list).html("<div class='noItems'>No more items</div>");
            var selected = data.parent.val();
            for (var value in values)
            {
                var text = values[value];
                var matches = settings.listFilterHandler(search, text);
                var isSelected = ($.inArray(value.toString(), selected) != -1);
                if ((!isSelected || !multiple) && matches)
                {
                    var listItem = $(settings.listItemTemplate);
                    listItem.addClass("selectListItem");
                    $(listItem).data('value', value);
                    $(listItem).data('text', text);
                    $(listItem).text(text);
                    if (!multiple && value == selected)
                    {
                        $(listItem).addClass("selected");
                    }
                    $(list).append(listItem);
                }
            }
        }

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

        function hideList(wrapper)
        {
            var list = wrapper.selectData.list;
            $(list).css('display', 'none');
            var input = wrapper.selectData.search;
            if (typeof input.timeout != 'undefined')
            {
                clearTimeout(input.timeout);
            }
        }

        function selectItem(wrapper, item)
        {
            var data = wrapper.selectData;
            var value = $(item).data("value");
            var text = $(item).data("text");
            data.values[value] = text;
            if (settings.searchEnabled)
            {
                select(wrapper, value);
            } else {
                var parent = data.parent;
                if (data.multiple)
                {
                    $("option[value='" + value + "']", parent).prop("selected", true);
                } else {
                    $(".selectLabel.selected", wrapper).removeClass("selected").addClass("unselected");
                    parent.val(value);
                }
                $(item).removeClass("unselected").addClass("selected");
            }
            data.parent.trigger("change");
        }

        function exists(item)
        {
            return (typeof item.selectData != 'undefined');
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
                    var wrapper = this.selectData.wrapper;
                    values.push(getValues(wrapper));
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
                        $(this).css("display", "initial");
                        $(this.selectData.wrapper).remove();
                        delete this.selectData;
                        break;
                    }
                    case "create":
                    default:
                    {
                        if (exists(this))
                        {
                            return true;
                        }
                        $(this).css("display", "none");
                        var wrapper = $(settings.wrapperTemplate);
                        $(wrapper).addClass("prettySelect");
                        var opts = $("<div class='selectOptions'>");
                        wrapper.append(opts);

                        var stayFocused = false;
                        var listIsOpen = false;
                        var multiple = (typeof $(this).attr("multiple") != 'undefined');

                        this.selectData = {
                            'wrapper': wrapper
                        };

                        var options = $("option", this);
                        var values = {};
                        var selected = [];
                        options.each(function () {
                            var val = $(this).val();
                            if ($(this).is(":selected"))
                            {
                                selected.push(val);
                            }
                            values[val] = $(this).text();
                        });

                        wrapper.selectData = {
                            'parent': $(this),
                            'options': opts,
                            'values': values,
                            'multiple': multiple
                        }

                        if (settings.valuesHandler != null && !settings.searchEnabled)
                        {
                            wrapper.addClass("loading");
                            $.when(settings.valuesHandler(wrapper, "")).then(function (response) {
                                $.extend(wrapper.selectData.values, response);
                                render(wrapper, selected);
                                wrapper.removeClass("loading");
                            });
                        } else {
                            render(wrapper, selected);
                        }

                        if (settings.searchEnabled) {
                            wrapper.bind("mousedown", function (e) {
                                stayFocused = true;
                            }).bind("click", function () {
                                focusSearch(wrapper);
                                stayFocused = false;
                            });

                            if (multiple)
                            {
                                wrapper.on("dblclick", ".selectLabel", function () {
                                    unselect(wrapper, $(this));
                                });
                            }

                            wrapper.on("click", ".selectLabel .close", function () {
                                unselect(wrapper, $(this).closest(".selectLabel"));
                            });

                            var searchWrap = $("<div class='selectSearchWrap'>");

                            var search = $("<input type='text' class='selectSearch'>");
                            wrapper.selectData.search = $(search);
                            search.lastState = "";

                            search.bind("keyup", function () {
                                searchKeyUp(wrapper);
                            });

                            search.bind("focus", function () {
                                if (!listIsOpen)
                                {
                                    showList(wrapper);
                                    $(wrapper).addClass("focused");
                                    listIsOpen = true;
                                }
                            });

                            var list = $(settings.listTemplate);
                            list.addClass("selectList");
                            list.css("display","none");
                            wrapper.selectData.list = $(list);

                            list.on("click", ".selectListItem:not(.selected)", function (e) {
                                selectItem(wrapper, $(this));
                                if (multiple)
                                {
                                    $(this).remove();
                                } else {
                                    $(".selectListItem.selected", list).removeClass("selected");
                                    $(this).addClass("selected");
                                }
                            });

                            search.bind("blur", function () {
                                if (!stayFocused)
                                {
                                    hideList(wrapper);
                                    $(wrapper).removeClass("focused");
                                    listIsOpen = false;
                                }
                                stayFocused = false;
                            });

                            searchWrap.append(list);
                            searchWrap.append(search);
                            searchWrap.append($("<span class='glyphicon glyphicon-search'>"));

                            wrapper.append(searchWrap);

                            wrapper.addClass("has-search");
                        } else {
                            if (multiple)
                            {
                                wrapper.on("click", ".selectLabel.selected", function () {
                                    unselect(wrapper, $(this));
                                    return false;
                                });
                            }
                            wrapper.on("click", ".selectLabel.unselected", function () {
                                selectItem(wrapper, $(this));
                                return false;
                            });
                        }

                        wrapper.insertAfter($(this));
                    }
                }
            });
        }
    }
}(jQuery));
